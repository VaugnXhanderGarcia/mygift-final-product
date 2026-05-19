import { Component, OnInit } from '@angular/core';
import { OrderService } from '../_services/order.service';
import { AlertService } from '../_services/alert.service';

@Component({ templateUrl: './admin-orders.component.html' })
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  statuses = ['Pending', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
  constructor(private orderService: OrderService, private alertService: AlertService) {}
  ngOnInit() { this.load(); }
  load() { this.orderService.getAll().subscribe({ next: o => this.orders = o, error: e => this.alertService.error(e) }); }
  update(order: any, status: string) { this.orderService.updateStatus(order.id, status).subscribe({ next: () => { order.status = status; this.alertService.success('Order updated.'); }, error: e => this.alertService.error(e) }); }
}
