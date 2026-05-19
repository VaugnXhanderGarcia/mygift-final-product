import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AccountService } from '../_services/account.service';
import { AlertService } from '../_services/alert.service';
@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html'
})
export class AdminLoginComponent {
  form: any;
  loading = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private alertService: AlertService
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.alertService.clear?.();

    if (this.form.invalid) {
      return;
    }

    this.loading = true;

    this.accountService.login(this.f.email.value, this.f.password.value)
      .subscribe({
        next: () => {
          this.router.navigate(['/admin/orders']);
        },
        error: (error) => {
          this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}