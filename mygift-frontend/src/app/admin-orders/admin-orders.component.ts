import { Component, OnInit } from '@angular/core';
import { OrderService } from '../_services/order.service';
import { AlertService } from '../_services/alert.service';

@Component({
  templateUrl: './admin-orders.component.html'
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;

  preparedItems: { [key: string]: boolean } = {};

  statuses = [
    'Pending',
    'Preparing',
    'Ready for Pickup',
    'Completed',
    'Cancelled'
  ];

  selectedStatus = 'Pending';

  statusCards = [
    {
      status: 'Pending',
      title: 'Pending',
      description: 'New orders waiting to be prepared.'
    },
    {
      status: 'Preparing',
      title: 'Preparing',
      description: 'Orders currently being prepared.'
    },
    {
      status: 'Ready for Pickup',
      title: 'Ready for Pickup',
      description: 'Orders ready for customer pickup.'
    },
    {
      status: 'Completed',
      title: 'Completed',
      description: 'Finished and claimed orders.'
    },
    {
      status: 'Cancelled',
      title: 'Cancelled',
      description: 'Cancelled customer orders.'
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
        this.orders = orders || [];
        this.loadPreparedItems();
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  loadPreparedItems(): void {
    this.preparedItems = {};

    for (const order of this.orders) {
      if (!Array.isArray(order.items)) {
        continue;
      }

      order.items.forEach((item: any, index: number) => {
        const key = this.getPreparedStorageKey(order, item, index);
        this.preparedItems[key] = localStorage.getItem(key) === 'true';
      });
    }
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  getOrdersByStatus(status: string): any[] {
    return this.orders.filter(order => order.status === status);
  }

  get selectedOrders(): any[] {
    return this.getOrdersByStatus(this.selectedStatus);
  }

  getStatusCount(status: string): number {
    return this.getOrdersByStatus(status).length;
  }

  updateStatus(order: any, status: string, bypassChecklist = false): void {
    if (
      status === 'Ready for Pickup' &&
      !this.canMoveToReady(order) &&
      !bypassChecklist
    ) {
      this.alertService.error(
        'Please check all ordered products first, or use Bypass Continue if you need to proceed.'
      );
      return;
    }

    if (status === order.status) {
      return;
    }

    if (status === 'Cancelled') {
      const confirmCancel = confirm(`Cancel order ${order.orderCode}?`);

      if (!confirmCancel) {
        return;
      }
    }

    this.orderService.updateStatus(order.id, status).subscribe({
      next: response => {
        const updatedOrder = response?.order || {
          ...order,
          status
        };

        this.orders = this.orders.map(existingOrder =>
          existingOrder.id === order.id ? updatedOrder : existingOrder
        );

        this.selectedStatus = status;

        if (status === 'Ready for Pickup') {
          this.clearPreparedItems(order);
        }

        this.alertService.success(`Order moved to ${status}.`);
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  moveToNextStatus(order: any): void {
    if (order.status === 'Pending') {
      this.updateStatus(order, 'Preparing');
      return;
    }

    if (order.status === 'Preparing') {
      this.updateStatus(order, 'Ready for Pickup');
      return;
    }

    if (order.status === 'Ready for Pickup') {
      this.updateStatus(order, 'Completed');
      return;
    }
  }

  bypassToReadyForPickup(order: any): void {
    const confirmed = confirm(
      `Bypass product checklist and move order ${order.orderCode} to Ready for Pickup?`
    );

    if (!confirmed) {
      return;
    }

    this.updateStatus(order, 'Ready for Pickup', true);
  }

  getNextStatusLabel(order: any): string {
    if (order.status === 'Pending') {
      return 'Start Preparing';
    }

    if (order.status === 'Preparing') {
      return 'Move to Ready for Pickup';
    }

    if (order.status === 'Ready for Pickup') {
      return 'Complete Order';
    }

    return '';
  }

  canShowNextButton(order: any): boolean {
    return ['Pending', 'Preparing', 'Ready for Pickup'].includes(order.status);
  }

  hasMultipleItems(order: any): boolean {
    return Array.isArray(order.items) && order.items.length > 1;
  }

  canMoveToReady(order: any): boolean {
    if (order.status !== 'Preparing') {
      return true;
    }

    if (!this.hasMultipleItems(order)) {
      return true;
    }

    return this.areAllItemsPrepared(order);
  }

  areAllItemsPrepared(order: any): boolean {
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return false;
    }

    return order.items.every((item: any, index: number) =>
      this.isItemPrepared(order, item, index)
    );
  }

  isItemPrepared(order: any, item: any, index: number): boolean {
    const key = this.getPreparedStorageKey(order, item, index);
    return this.preparedItems[key] === true;
  }

  setItemPrepared(order: any, item: any, index: number, checked: boolean): void {
    const key = this.getPreparedStorageKey(order, item, index);

    this.preparedItems[key] = checked;

    if (checked) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
  }

  clearPreparedItems(order: any): void {
    if (!Array.isArray(order.items)) {
      return;
    }

    order.items.forEach((item: any, index: number) => {
      const key = this.getPreparedStorageKey(order, item, index);
      delete this.preparedItems[key];
      localStorage.removeItem(key);
    });
  }

  getPreparedStorageKey(order: any, item: any, index: number): string {
    const orderId = order.id || order.orderCode;
    const itemId =
      item.id ||
      item.productId ||
      item.productName ||
      `item-${index}`;

    return `mygift-order-${orderId}-${itemId}-${index}-prepared`;
  }

  getStatusBadgeClass(status: string): string {
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

  getCardBorderClass(status: string): string {
    if (this.selectedStatus !== status) {
      return 'border-light';
    }

    if (status === 'Pending') {
      return 'border-secondary';
    }

    if (status === 'Preparing') {
      return 'border-warning';
    }

    if (status === 'Ready for Pickup') {
      return 'border-info';
    }

    if (status === 'Completed') {
      return 'border-success';
    }

    if (status === 'Cancelled') {
      return 'border-danger';
    }

    return 'border-primary';
  }

  formatMoney(value: any): string {
    return Number(value || 0).toFixed(2);
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