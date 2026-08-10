import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: 'grid' },
  { path: '/import', label: 'Import Excel', icon: 'upload' },
  { path: '/transactions', label: 'Transacciones', icon: 'table' },
  { path: '/categories', label: 'Categorías', icon: 'tag' },
  { path: '/investments', label: 'Ahorros + Inversiones', icon: 'trend' },
  { path: '/analytics', label: 'Analytics', icon: 'bars' }
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss'
})
export class AppShell {
  protected readonly theme = inject(ThemeService);
  protected readonly authService = inject(AuthService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly mobileNavOpen = signal(false);

  constructor() {
    this.authService.loadCurrentUser().catch(() => {
      /* interceptor handles 401 redirect */
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
