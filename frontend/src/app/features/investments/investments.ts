import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Currency } from '../../core/models/transaction.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { Investment, Saving } from './investments.model';

const PALETTE = ['#7c9cf0', '#f0b46b', '#7fd1ae', '#e18ba0', '#8fd3e8'];
const EVOLUTION_MONTHS = ['mar', 'abr', 'may', 'jun', 'jul', 'ago'];
const EVOLUTION_ARS = [820000, 860000, 910000, 940000, 990000, 1040000];

// Sin backend todavia (roadmap item 4) - estado local en memoria, no persiste entre sesiones.
@Component({
  selector: 'app-investments',
  imports: [FormsModule, CurrencyFormatPipe],
  templateUrl: './investments.html',
  styleUrl: './investments.scss'
})
export class Investments {
  protected readonly tab = signal<'portfolio' | 'savings'>('portfolio');
  protected readonly iolConnected = signal(false);
  protected readonly invViewCurrency = signal<Currency>('ARS');

  protected readonly investments = signal<Investment[]>([
    { id: 'i1', ticker: 'AL30', name: 'Bono AL30', qty: 200, avgCost: 780, price: 845, currency: 'ARS' },
    { id: 'i2', ticker: 'GGAL', name: 'Grupo Galicia', qty: 80, avgCost: 4100, price: 4480, currency: 'ARS' },
    { id: 'i3', ticker: 'PAMP', name: 'Pampa Energía', qty: 150, avgCost: 1850, price: 1790, currency: 'ARS' },
    { id: 'i4', ticker: 'AL30D', name: 'Bono AL30D', qty: 100, avgCost: 62, price: 68, currency: 'USD' },
    { id: 'i5', ticker: 'GD30', name: 'Bono GD30', qty: 50, avgCost: 58, price: 55, currency: 'USD' }
  ]);

  protected readonly savings = signal<Saving[]>([
    { id: 's1', label: 'Efectivo en casa', amount: 2000, currency: 'USD' },
    { id: 's2', label: 'Caja de ahorro', amount: 180000, currency: 'ARS' }
  ]);

  protected readonly editingInvId = signal<string | null>(null);
  protected readonly deleteConfirmInvId = signal<string | null>(null);
  protected readonly draftInvQty = signal('');
  protected readonly draftInvPrice = signal('');

  protected readonly editingSavId = signal<string | null>(null);
  protected readonly draftSavName = signal('');
  protected readonly draftSavAmount = signal('');
  protected readonly draftSavCurrency = signal<Currency>('ARS');
  protected readonly newSavName = signal('');
  protected readonly newSavAmount = signal('');
  protected readonly newSavCurrency = signal<Currency>('USD');

  protected readonly evolutionMonths = EVOLUTION_MONTHS;

  private byCurrency(currency: Currency) {
    return this.investments().filter((i) => i.currency === currency);
  }

  protected readonly arsValue = computed(() => this.byCurrency('ARS').reduce((s, i) => s + i.qty * i.price, 0));
  protected readonly arsCost = computed(() => this.byCurrency('ARS').reduce((s, i) => s + i.qty * i.avgCost, 0));
  protected readonly arsResult = computed(() => this.arsValue() - this.arsCost());

  protected readonly usdValue = computed(() => this.byCurrency('USD').reduce((s, i) => s + i.qty * i.price, 0));
  protected readonly usdCost = computed(() => this.byCurrency('USD').reduce((s, i) => s + i.qty * i.avgCost, 0));
  protected readonly usdResult = computed(() => this.usdValue() - this.usdCost());

  protected readonly investmentsEnriched = computed(() =>
    this.investments().map((inv) => ({
      ...inv,
      value: inv.qty * inv.price,
      result: inv.qty * (inv.price - inv.avgCost)
    }))
  );

  protected readonly portfolioTotalArs = computed(() => this.arsValue());

  protected readonly portfolioSlices = computed(() => {
    const items = this.investmentsEnriched().filter((i) => i.currency === this.invViewCurrency());
    const total = items.reduce((s, i) => s + i.value, 0);
    let acc = 0;
    return items.map((item, idx) => {
      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
      const start = acc;
      acc += pct;
      return { ticker: item.ticker, pct, color: PALETTE[idx % PALETTE.length], start, end: acc };
    });
  });

  protected readonly portfolioGaugeGradient = computed(() =>
    this.portfolioSlices()
      .map((s) => `${s.color} ${s.start}% ${s.end}%`)
      .join(', ')
  );

  protected readonly portfolioTotalLabel = computed(() =>
    this.invViewCurrency() === 'ARS' ? this.arsValue() : this.usdValue()
  );

  protected readonly evolutionPoints = computed(() => {
    const max = Math.max(...EVOLUTION_ARS);
    const min = Math.min(...EVOLUTION_ARS);
    const range = max - min || 1;
    return EVOLUTION_ARS.map((v, i) => {
      const x = (i / (EVOLUTION_ARS.length - 1)) * 300;
      const y = 110 - ((v - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
  });

  protected readonly evolutionAreaPoints = computed(() => `0,120 ${this.evolutionPoints()} 300,120`);

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

  setTab(tab: 'portfolio' | 'savings'): void {
    this.tab.set(tab);
  }

  toggleIol(): void {
    this.iolConnected.update((v) => !v);
  }

  setInvViewCurrency(c: Currency): void {
    this.invViewCurrency.set(c);
  }

  startEditInv(inv: Investment): void {
    this.editingInvId.set(inv.id);
    this.draftInvQty.set(String(inv.qty));
    this.draftInvPrice.set(String(inv.price));
    this.deleteConfirmInvId.set(null);
  }

  cancelEditInv(): void {
    this.editingInvId.set(null);
  }

  saveEditInv(): void {
    const id = this.editingInvId();
    this.investments.update((list) =>
      list.map((i) =>
        i.id === id
          ? { ...i, qty: Number(this.draftInvQty()) || i.qty, price: Number(this.draftInvPrice()) || i.price }
          : i
      )
    );
    this.editingInvId.set(null);
  }

  requestDeleteInv(id: string): void {
    this.deleteConfirmInvId.set(id);
  }

  cancelDeleteInv(): void {
    this.deleteConfirmInvId.set(null);
  }

  confirmDeleteInv(id: string): void {
    this.investments.update((list) => list.filter((i) => i.id !== id));
    this.deleteConfirmInvId.set(null);
  }

  startEditSav(sav: Saving): void {
    this.editingSavId.set(sav.id);
    this.draftSavName.set(sav.label);
    this.draftSavAmount.set(String(sav.amount));
    this.draftSavCurrency.set(sav.currency);
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
              currency: this.draftSavCurrency()
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
        currency: this.newSavCurrency()
      }
    ]);
    this.newSavName.set('');
    this.newSavAmount.set('');
  }
}
