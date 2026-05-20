import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../_services/order.service';

@Component({
  selector: 'app-track-order',
  templateUrl: './track-order.component.html',
  styleUrls: ['./track-order.component.css']
})
export class TrackOrderComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  order: any = null;
  loading = false;
  errorMessage = '';
  autoRefreshTimer: any = null;

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
    this.form = this.fb.group({
      orderCode: ['', Validators.required],
      contactNumber: ['', Validators.required]
    });

    const reference = this.route.snapshot.queryParamMap.get('reference');

    if (reference) {
      this.form.patchValue({
        orderCode: reference
      });
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  trackOrder(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const orderCode = this.form.value.orderCode;
    const contactNumber = this.form.value.contactNumber;

    this.orderService.trackOrder(orderCode, contactNumber).subscribe({
      next: order => {
        this.loading = false;
        this.order = order;
        this.startAutoRefresh();
      },
      error: error => {
        this.loading = false;
        this.order = null;
        this.stopAutoRefresh();

        this.errorMessage =
          error?.error?.message ||
          'Order not found. Please check your reference number and contact number.';
      }
    });
  }

  refreshOrderSilently(): void {
    if (this.form.invalid) {
      return;
    }

    const orderCode = this.form.value.orderCode;
    const contactNumber = this.form.value.contactNumber;

    this.orderService.trackOrder(orderCode, contactNumber).subscribe({
      next: order => {
        this.order = order;
      },
      error: () => {
        this.stopAutoRefresh();
      }
    });
  }

  startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.autoRefreshTimer = setInterval(() => {
      this.refreshOrderSilently();
    }, 10000);
  }

  stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  getStatusClass(status: string): string {
    if (status === 'Pending') return 'bg-secondary';
    if (status === 'Preparing') return 'bg-warning text-dark';
    if (status === 'Ready for Pickup') return 'bg-info text-dark';
    if (status === 'Completed') return 'bg-success';
    if (status === 'Cancelled') return 'bg-danger';
    return 'bg-secondary';
  }

  isStepActive(step: string): boolean {
    if (!this.order || this.order.status === 'Cancelled') {
      return false;
    }

    const currentIndex = this.statusSteps.indexOf(this.order.status);
    const stepIndex = this.statusSteps.indexOf(step);

    return stepIndex <= currentIndex;
  }

  getTotal(): number {
    if (!this.order) {
      return 0;
    }

    return Number(this.order.totalAmount || 0);
  }
}