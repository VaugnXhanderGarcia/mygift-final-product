import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrderService } from '../_services/order.service';

@Component({
  templateUrl: './track-order.component.html',
  styleUrls: ['./track-order.component.css']
})
export class TrackOrderComponent implements OnInit {
  form!: FormGroup;
  order: any = null;
  loading = false;
  errorMessage = '';

  statusSteps = [
    'Pending',
    'Preparing',
    'Ready for Pickup',
    'Completed'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    const reference = this.route.snapshot.queryParamMap.get('reference') || '';

    this.form = this.fb.group({
      reference: [reference],
      customerName: ['', Validators.required]
    });
  }

  submit(): void {
    this.errorMessage = '';
    this.order = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please enter your customer name.';
      return;
    }

    const reference = String(this.form.value.reference || '').trim();
    const customerName = String(this.form.value.customerName || '').trim();

    this.loading = true;

    const request = reference
      ? this.orderService.trackByReference(reference, customerName)
      : this.orderService.trackByName(customerName);

    request.subscribe({
      next: order => {
        this.loading = false;
        this.order = order;
      },
      error: error => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message ||
          'Order not found. Please check your name or reference number.';
      }
    });
  }

  isStepDone(step: string): boolean {
    if (!this.order || this.order.status === 'Cancelled') {
      return false;
    }

    const currentIndex = this.statusSteps.indexOf(this.order.status);
    const stepIndex = this.statusSteps.indexOf(step);

    return currentIndex >= stepIndex;
  }

  isCurrentStep(step: string): boolean {
    return this.order?.status === step;
  }

  formatMoney(value: any): string {
    return Number(value || 0).toFixed(2);
  }

  getStatusClass(status: string): string {
    if (status === 'Pending') {
      return 'bg-secondary';
    }

    if (status === 'Preparing') {
      return 'bg-warning text-dark';
    }

    if (status === 'Ready for Pickup') {
      return 'bg-info text-dark';
    }

    if (status === 'Completed') {
      return 'bg-success';
    }

    if (status === 'Cancelled') {
      return 'bg-danger';
    }

    return 'bg-secondary';
  }
}