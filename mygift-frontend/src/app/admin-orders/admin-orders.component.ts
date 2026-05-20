import { Component, OnInit } from '@angular/core';
import { OrderService } from '../_services/order.service';
import { AlertService } from '../_services/alert.service';

@Component({
  templateUrl: './admin-orders.component.html'
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;

  statuses = [
    'Pending',
    'Preparing',
    'Ready for Pickup',
    'Completed',
    'Cancelled'
  ];

  statusSections = [
    {
      title: 'New Orders',
      status: 'Pending',
      description: 'Orders waiting to be prepared.'
    },
    {
      title: 'Preparing',
      status: 'Preparing',
      description: 'Orders currently being prepared.'
    },
    {
      title: 'Ready for Pickup',
      status: 'Ready for Pickup',
      description: 'Orders ready for customer pickup.'
    },
    {
      title: 'Completed Orders',
      status: 'Completed',
      description: 'Orders already claimed by customers.'
    },
    {
      title: 'Cancelled Orders',
      status: 'Cancelled',
      description: 'Orders that were cancelled.'
    }
  ];

  constructor(
    private orderService: OrderService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    this.orderService.getAll().subscribe({
      next: orders => {
        this.orders = orders;
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.alertService.error(error);
      }
    });
  }

  getOrdersByStatus(status: string): any[] {
    return this.orders.filter(order => order.status === status);
  }

  update(order: any, status: string): void {
    if (order.status === status) {
      return;
    }

    this.orderService.updateStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;
        this.alertService.success(`Order ${order.orderCode} moved to ${status}.`);
      },
      error: error => {
        this.alertService.error(error);
      }
    });
  }

  moveToPreparing(order: any): void {
    this.update(order, 'Preparing');
  }

  moveToReady(order: any): void {
    this.update(order, 'Ready for Pickup');
  }

  moveToCompleted(order: any): void {
    this.update(order, 'Completed');
  }

  moveToCancelled(order: any): void {
    this.update(order, 'Cancelled');
  }

  getTotalByStatus(status: string): number {
    return this.getOrdersByStatus(status).length;
  }

  getGrandTotal(order: any): number {
    return Number(order.totalAmount || 0);
  }
}