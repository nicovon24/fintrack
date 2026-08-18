import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { IolHolding } from '../../core/models/iol.model';
import { Currency } from '../../core/models/transaction.model';
import { DolarBlueService } from '../../core/services/dolar-blue.service';
import { IolService } from '../../core/services/iol.service';
import { DonutChart, DonutSlice } from '../../shared/components/donut-chart/donut-chart';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { Saving, SavingKind } from './investments.model';

type Tab = 'portfolio' | 'savings' | 'networth';

// Ahorros cargados a mano: no hay entidad en backend, asi que viven en localStorage del navegador.
// Son datos propios del usuario, no de IOL: persistirlos no toca la regla de docs/specs/07.
const SAVINGS_KEY = 'fintrack.savings';

// Fila de la tabla ya expresada en la moneda de vista (el precio unitario queda en su moneda
// original: convertir la cotizacion de un CEDEAR a USD no le dice nada a nadie).
interface HoldingRow extends IolHolding {
  viewValue: number;
  viewResult: number;
}

interface NetWorthBucket {
  label: string;
  value: number;
  pct: number;
}

function loadSavings(): Saving[] {
  try {
    const raw = localStorage.getItem(SAVINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Saving>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => typeof s?.id === 'string' && typeof s?.label === 'string')
      .map((s) => ({
        id: s.id as string,
        label: s.label as string,
        amount: Number(s.amount) || 0,
        currency: s.currency === 'USD' ? 'USD' : 'ARS',
        kind: s.kind === 'BANK' ? 'BANK' : 'CASH'
      }));
  } catch {
    return [];
  }
}

// Portfolio: tenencias reales de IOL, en vivo, sin persistir nada (ver docs/specs/07).
@Component({
  selector: 'app-investments',
  imports: [FormsModule, CurrencyFormatPipe, DecimalPipe, DonutChart, Skeleton],
  templateUrl: './investments.html',
  styleUrl: './investments.scss'
})
export class Investments {
  private readonly iolService = inject(IolService);
  private readonly dolarBlueService = inject(DolarBlueService);

  protected readonly tab = signal<Tab>('portfolio');
  protected readonly invViewCurrency = signal<Currency>('ARS');

  protected readonly iolConnected = this.iolService.connected;
  protected readonly showIolLoginModal = signal(false);
  protected readonly iolUsername = signal('');
  protected readonly iolPassword = signal('');
  protected readonly iolLoginSubmitting = signal(false);
  protected readonly iolLoginError = signal<string | null>(null);
  protected readonly iolLoading = signal(false);
  protected readonly iolLoadError = signal<string | null>(null);

  protected readonly investments = signal<IolHolding[]>([]);
  protected readonly cashArs = signal(0);
  protected readonly cashUsd = signal(0);

  protected readonly savings = signal<Saving[]>(loadSavings());

  protected readonly editingSavId = signal<string | null>(null);
  protected readonly draftSavName = signal('');
  protected readonly draftSavAmount = signal('');
  protected readonly draftSavCurrency = signal<Currency>('ARS');
  protected readonly draftSavKind = signal<SavingKind>('BANK');
  protected readonly newSavName = signal('');
  protected readonly newSavAmount = signal('');
  protected readonly newSavCurrency = signal<Currency>('USD');
  protected readonly newSavKind = signal<SavingKind>('BANK');

  // Cotizacion del blue para consolidar ARS + USD en un unico numero.
  protected readonly blueRate = signal<number | null>(null);

  constructor() {
    this.loadBlueRate();
    if (this.iolConnected()) {
      this.loadIolPortfolio();
    }

    effect(() => {
      const list = this.savings();
      try {
        localStorage.setItem(SAVINGS_KEY, JSON.stringify(list));
      } catch {
        // Sin localStorage (modo privado, cuota llena) los ahorros siguen andando en memoria.
      }
    });
  }

  loadBlueRate(): void {
    this.dolarBlueService.getQuote().subscribe({
      next: (quote) => this.blueRate.set(quote.venta),
      error: () => this.blueRate.set(null)
    });
  }

  private byCurrency(currency: Currency) {
    return this.investments().filter((i) => i.currency === currency);
  }

  // value/cost/result ya vienen calculados del backend a partir de los totales de IOL. No se
  // recalculan aca con qty * precio unitario porque los bonos cotizan cada 100 nominales.
  protected readonly arsHoldingsValue = computed(() => this.byCurrency('ARS').reduce((s, i) => s + i.value, 0));
  private readonly arsCost = computed(() => this.byCurrency('ARS').reduce((s, i) => s + i.cost, 0));
  protected readonly arsResult = computed(() => this.arsHoldingsValue() - this.arsCost());

  protected readonly usdHoldingsValue = computed(() => this.byCurrency('USD').reduce((s, i) => s + i.value, 0));
  private readonly usdCost = computed(() => this.byCurrency('USD').reduce((s, i) => s + i.cost, 0));
  protected readonly usdResult = computed(() => this.usdHoldingsValue() - this.usdCost());

  // Total valorizado = titulos + efectivo disponible, igual que el total que muestra IOL en pantalla.
  protected readonly arsValue = computed(() => this.arsHoldingsValue() + this.cashArs());
  protected readonly usdValue = computed(() => this.usdHoldingsValue() + this.cashUsd());

  // Variacion porcentual sobre lo invertido (el efectivo no entra: no tiene precio de compra).
  protected readonly arsResultPct = computed(() =>
    this.arsCost() > 0 ? (this.arsResult() / this.arsCost()) * 100 : 0
  );
  protected readonly usdResultPct = computed(() =>
    this.usdCost() > 0 ? (this.usdResult() / this.usdCost()) * 100 : 0
  );

  // --- Conversion a la moneda de vista ---
  // El toggle ARS/USD es global: convierte toda la cartera, no filtra por moneda. Si la API de
  // cotizacion no responde no inventamos un tipo de cambio: devolvemos null y la pantalla cae
  // al modo anterior (cada moneda por separado).
  protected readonly rateReady = computed(() => this.blueRate() !== null);

  private toView(value: number, from: Currency): number | null {
    const to = this.invViewCurrency();
    // Cero es cero en cualquier moneda: no hace falta cotizacion para convertirlo. Sin este
    // atajo, tener 0 tenencias en la moneda que no es la de vista (caso comun: recien conectado
    // a IOL, o cartera 100% en una moneda) exigia el blue igual y tiraba abajo Patrimonio entero
    // con el error de "no se pudo traer la cotizacion" aunque no hubiera nada que convertir.
    if (from === to || value === 0) return value;
    const rate = this.blueRate();
    if (!rate) return null;
    return from === 'USD' ? value * rate : value / rate;
  }

  private combine(ars: number, usd: number): number | null {
    const a = this.toView(ars, 'ARS');
    const u = this.toView(usd, 'USD');
    return a === null || u === null ? null : a + u;
  }

  // --- Patrimonio consolidado ---

  protected readonly totalValue = computed(() => this.combine(this.arsValue(), this.usdValue()));
  private readonly totalCost = computed(() => this.combine(this.arsCost(), this.usdCost()));
  protected readonly totalResult = computed(() => this.combine(this.arsResult(), this.usdResult()));

  protected readonly totalResultPct = computed(() => {
    const cost = this.totalCost();
    const result = this.totalResult();
    return cost && cost > 0 && result !== null ? (result / cost) * 100 : 0;
  });

  // Los dos sumandos del total, ya convertidos: la card muestra de donde sale el numero grande.
  protected readonly arsValueInView = computed(() => this.toView(this.arsValue(), 'ARS'));
  protected readonly usdValueInView = computed(() => this.toView(this.usdValue(), 'USD'));

  // Cuanto de la cartera esta dolarizado. Dato real, sin historico.
  protected readonly composition = computed(() => {
    const total = this.totalValue();
    const ars = this.arsValueInView();
    if (total === null || ars === null || total <= 0) return null;
    const arsPct = Math.min(Math.max((ars / total) * 100, 0), 100);
    return { arsPct, usdPct: 100 - arsPct };
  });

  // Sin cotizacion no se puede mezclar monedas: donut y tabla vuelven a filtrar por la moneda elegida.
  private readonly viewHoldings = computed(() =>
    this.rateReady() ? this.investments() : this.byCurrency(this.invViewCurrency())
  );

  // viewHoldings ya garantiza que toView nunca devuelva null aca: sin cotizacion filtra a la
  // moneda de vista (from === to, atajo directo), y con cotizacion el rate siempre esta.
  protected readonly rows = computed<HoldingRow[]>(() =>
    this.viewHoldings().map((item) => ({
      ...item,
      viewValue: this.toView(item.value, item.currency)!,
      viewResult: this.toView(item.result, item.currency)!
    }))
  );

  // Distribucion de cartera: el donut compartido se encarga de colores, plegado en "Otros",
  // tooltip y toggles.
  protected readonly allocationSlices = computed<DonutSlice[]>(() =>
    this.rows().map((item) => ({
      label: item.ticker,
      value: item.viewValue
    }))
  );

  // --- Ahorros ---

  protected readonly bankSavings = computed(() => this.savings().filter((s) => s.kind === 'BANK'));
  protected readonly cashSavings = computed(() => this.savings().filter((s) => s.kind === 'CASH'));

  protected readonly savingsArsTotal = computed(() =>
    this.savings()
      .filter((s) => s.currency === 'ARS')
      .reduce((sum, s) => sum + s.amount, 0)
  );

  protected readonly savingsUsdTotal = computed(() =>
    this.savings()
      .filter((s) => s.currency === 'USD')
      .reduce((sum, s) => sum + s.amount, 0)
  );

  // Una sola moneda mezclada necesita cotizacion. Lista vacia da 0, no null: cero es cero en
  // cualquier moneda.
  private sumInView(list: Saving[]): number | null {
    let total = 0;
    for (const sav of list) {
      const value = this.toView(sav.amount, sav.currency);
      if (value === null) return null;
      total += value;
    }
    return total;
  }

  protected readonly savingGroups = computed(() => [
    { title: 'Banco', items: this.bankSavings() },
    { title: 'Efectivo', items: this.cashSavings() }
  ]);

  protected readonly bankTotal = computed(() => this.sumInView(this.bankSavings()));
  protected readonly cashTotal = computed(() => this.sumInView(this.cashSavings()));
  protected readonly savingsTotal = computed(() => this.sumInView(this.savings()));

  // --- Patrimonio ---
  // Tres bloques: cartera de IOL (titulos + efectivo en el broker), plata en el banco y efectivo.
  // Sin IOL conectado el bloque de inversiones vale 0 y el patrimonio sigue teniendo sentido.

  protected readonly investmentsTotal = computed(() =>
    this.iolConnected() ? this.totalValue() : 0
  );

  protected readonly netWorth = computed(() => {
    const parts = [this.investmentsTotal(), this.bankTotal(), this.cashTotal()];
    return parts.some((p) => p === null) ? null : parts.reduce((sum, p) => sum! + p!, 0);
  });

  protected readonly netWorthBuckets = computed<NetWorthBucket[] | null>(() => {
    const total = this.netWorth();
    if (total === null) return null;
    const parts: [string, number][] = [
      ['Inversiones', this.investmentsTotal() ?? 0],
      ['Banco', this.bankTotal() ?? 0],
      ['Efectivo', this.cashTotal() ?? 0]
    ];
    return parts.map(([label, value]) => ({
      label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0
    }));
  });

  protected readonly netWorthSlices = computed<DonutSlice[]>(() =>
    (this.netWorthBuckets() ?? []).map((b) => ({ label: b.label, value: b.value }))
  );

  setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  setInvViewCurrency(c: Currency): void {
    this.invViewCurrency.set(c);
  }

  openIolLogin(): void {
    this.iolLoginError.set(null);
    this.iolUsername.set('');
    this.iolPassword.set('');
    this.showIolLoginModal.set(true);
  }

  closeIolLogin(): void {
    this.showIolLoginModal.set(false);
  }

  async submitIolLogin(): Promise<void> {
    const username = this.iolUsername();
    const password = this.iolPassword();
    if (!username || !password) return;

    this.iolLoginSubmitting.set(true);
    this.iolLoginError.set(null);
    try {
      await this.iolService.login(username, password);
      this.iolPassword.set('');
      this.showIolLoginModal.set(false);
      await this.loadIolPortfolio();
    } catch (err) {
      const e = err as { status?: number; error?: { error?: string; messages?: string[] } };
      if (e.status === 401 && e.error?.error !== 'IOL Error') {
        this.iolLoginError.set('Tu sesión de fintrack venció. Cerrá sesión y volvé a entrar antes de conectar IOL.');
      } else {
        const detail = e.error?.messages?.join(' — ');
        this.iolLoginError.set(detail ?? `No se pudo conectar con IOL (error ${e.status ?? '?'}).`);
      }
    } finally {
      this.iolLoginSubmitting.set(false);
    }
  }

  disconnectIol(): void {
    this.iolService.disconnect();
    this.investments.set([]);
    this.cashArs.set(0);
    this.cashUsd.set(0);
    this.iolLoadError.set(null);
  }

  async loadIolPortfolio(): Promise<void> {
    this.iolLoading.set(true);
    this.iolLoadError.set(null);
    try {
      const res = await firstValueFrom(this.iolService.getPortfolio());
      this.investments.set(res.holdings);
      this.cashArs.set(res.cashArs ?? 0);
      this.cashUsd.set(res.cashUsd ?? 0);
    } catch (err) {
      const e = err as { status?: number; error?: { error?: string; messages?: string[] } };
      const isIolError = e.error?.error === 'IOL Error';
      const detail = e.error?.messages?.join(' — ');

      if (e.status === 401 && isIolError) {
        this.iolService.disconnect();
        this.iolLoadError.set('Tu sesión de IOL venció. Volvé a conectarte.');
      } else if (e.status === 401) {
        this.iolLoadError.set('Tu sesión de fintrack venció. Cerrá sesión y volvé a entrar.');
      } else {
        this.iolLoadError.set(detail ?? `No se pudo cargar la cartera de IOL (error ${e.status ?? '?'}).`);
      }
    } finally {
      this.iolLoading.set(false);
    }
  }

  startEditSav(sav: Saving): void {
    this.editingSavId.set(sav.id);
    this.draftSavName.set(sav.label);
    this.draftSavAmount.set(String(sav.amount));
    this.draftSavCurrency.set(sav.currency);
    this.draftSavKind.set(sav.kind);
  }

  cancelEditSav(): void {
    this.editingSavId.set(null);
  }

  saveEditSav(): void {
    const id = this.editingSavId();
    this.savings.update((list) =>
      list.map((s) =>
        s.id === id
          ? {
              ...s,
              label: this.draftSavName() || s.label,
              amount: Number(this.draftSavAmount()) || s.amount,
              currency: this.draftSavCurrency(),
              kind: this.draftSavKind()
            }
          : s
      )
    );
    this.editingSavId.set(null);
  }

  deleteSaving(id: string): void {
    this.savings.update((list) => list.filter((s) => s.id !== id));
  }

  addSaving(): void {
    const name = this.newSavName().trim();
    if (!name) return;
    this.savings.update((list) => [
      ...list,
      {
        id: 's' + Date.now(),
        label: name,
        amount: Number(this.newSavAmount()) || 0,
        currency: this.newSavCurrency(),
        kind: this.newSavKind()
      }
    ]);
    this.newSavName.set('');
    this.newSavAmount.set('');
  }
}
