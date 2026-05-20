import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from './_services/account.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    private accountService: AccountService,
    private router: Router
  ) {}

  get account() {
    return this.accountService.accountValue;
  }

  get showAdminNavbar(): boolean {
    return !!this.account && this.router.url.startsWith('/admin');
  }

  logout(): void {
    this.accountService.logout();
  }
}