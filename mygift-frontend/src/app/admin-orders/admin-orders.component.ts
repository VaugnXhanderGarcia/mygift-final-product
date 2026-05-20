import { Component, OnInit } from '@angular/core';
import { OrderService } from '../_services/order.service';
import { AlertService } from '../_services/alert.service';

@Component({
  templateUrl: './admin-orders.component.html'
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];

  statuses = [
    'Pending',
    'Preparing',
    'Ready for Pickup',
    'Completed',
    'Cancelled'
  ];

  constructor(
    private orderService: OrderService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.orderService.getAll().subscribe({
      next: orders => {
        this.orders = orders || [];
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  getOrdersByStatus(status: string): any[] {
    return this.orders.filter(order => order.status === status);
  }

  update(order: any, status: string): void {
    if (status === order.status) {
      return;
    }

    if (status === 'Ready for Pickup' && !this.allItemsPrepared(order)) {
      this.alertService.error(
        'Please check all products first before moving this order to Ready for Pickup.'
      );
      return;
    }

    this.orderService.updateStatus(order.id, status).subscribe({
      next: response => {
        const updatedOrder = response.order;

        this.orders = this.orders.map(existingOrder =>
          existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
        );

        this.alertService.success('Order status updated successfully.');
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  toggleItemPrepared(order: any, item: any): void {
    this.orderService.updateItemPrepared(order.id, item.id, item.isPrepared).subscribe({
      next: response => {
        const updatedOrder = response.order;

        this.orders = this.orders.map(existingOrder =>
          existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
        );
      },
      error: error => {
        item.isPrepared = !item.isPrepared;

        this.alertService.error(
          this.getErrorMessage(error) ||
          'Failed to update item preparation status.'
        );
      }
    });
  }

  allItemsPrepared(order: any): boolean {
    if (!order.items || order.items.length <= 1) {
      return true;
    }

    return order.items.every((item: any) => item.isPrepared === true);
  }

  preparedCount(order: any): number {
    if (!order.items) {
      return 0;
    }

    return order.items.filter((item: any) => item.isPrepared === true).length;
  }

  isStatusOptionDisabled(order: any, status: string): boolean {
    return status === 'Ready for Pickup' && !this.allItemsPrepared(order);
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'bg-secondary';

      case 'Preparing':
        return 'bg-warning text-dark';

      case 'Ready for Pickup':
        return 'bg-primary';

      case 'Completed':
        return 'bg-success';

      case 'Cancelled':
        return 'bg-danger';

      default:
        return 'bg-secondary';
    }
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    return (
      error?.error?.message ||
      error?.message ||
      'Something went wrong. Please try again.'
    );
  }
}