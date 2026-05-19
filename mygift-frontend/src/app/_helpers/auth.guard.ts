import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AccountService } from '../_services/account.service';
import { AlertService } from '../_services/alert.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private accountService: AccountService, private router: Router, private alertService: AlertService) {}
  canActivate() {
    if (this.accountService.adminValue) return true;
    this.alertService.error('Admin access only. Please log in first.');
    this.router.navigate(['/admin/login']);
    return false;
  }
}
