import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from './_services/account.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(
    public accountService: AccountService,
    public router: Router
  ) {}

  get account() {
    return this.accountService.accountValue;
  }

  get showAdminNavbar(): boolean {
    const publicPages = ['/', '/order', '/public'];
    return !!this.account && !publicPages.includes(this.router.url);
  }

  logout() {
    this.accountService.logout();
  }
}