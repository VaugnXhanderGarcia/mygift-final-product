import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../_services/account.service';
import { AlertService } from '../_services/alert.service';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.component.html'
})
export class AdminProfileComponent implements OnInit {
  form: any;
  loading = false;

  constructor(
    public accountService: AccountService,
    private fb: FormBuilder,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error('Please complete the password form.');
      return;
    }

    if (this.form.value.newPassword !== this.form.value.confirmPassword) {
      this.alertService.error('New password and confirm password do not match.');
      return;
    }

    this.loading = true;

    this.accountService.changePassword(
      this.form.value.currentPassword,
      this.form.value.newPassword
    ).subscribe({
      next: () => {
        this.alertService.success('Password changed successfully.');
        this.form.reset();
      },
      error: (error: any) => {
        this.alertService.error(error || 'Unable to change password.');
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}