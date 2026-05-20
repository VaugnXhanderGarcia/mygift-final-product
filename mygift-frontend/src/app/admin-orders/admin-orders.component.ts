import { Component, OnInit } from '@angular/core';
import { OrderService } from '../_services/order.service';
import { AlertService } from '../_services/alert.service';

@Component({
  templateUrl: './admin-orders.component.html'
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;

  preparedItems: { [orderId: number]: { [itemId: number]: boolean } } = {};
  editItems: { [itemId: number]: any } = {};
  addForms: { [orderId: number]: any } = {};

  selectedStatus = 'Pending';
  editingOrderId: number | null = null;

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

      for (const item of order.items) {
        if (!item.id || item.status === 'Cancelled') {
          continue;
        }

        const key = this.getPreparedStorageKey(order, item);

        if (!this.preparedItems[order.id]) {
          this.preparedItems[order.id] = {};
        }

        this.preparedItems[order.id][item.id] =
          localStorage.getItem(key) === 'true';
      }
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

  getActiveItems(order: any): any[] {
    return (order.items || []).filter((item: any) => item.status !== 'Cancelled');
  }

  getCancelledItems(order: any): any[] {
    return (order.items || []).filter((item: any) => item.status === 'Cancelled');
  }

  hasCancelledItems(order: any): boolean {
    return this.getCancelledItems(order).length > 0;
  }

  canEditOrder(order: any): boolean {
    return ['Pending', 'Preparing', 'Ready for Pickup'].includes(order.status);
  }

  startEditOrder(order: any): void {
    this.editingOrderId = order.id;

    for (const item of order.items || []) {
      this.editItems[item.id] = {
        productName: item.productName,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        status: item.status || 'Active'
      };
    }

    this.addForms[order.id] = {
      productName: '',
      quantity: 1,
      unitPrice: 0
    };
  }

  stopEditOrder(): void {
    this.editingOrderId = null;
  }

  isEditing(order: any): boolean {
    return this.editingOrderId === order.id;
  }

  setEditProductName(item: any, value: string): void {
    this.ensureEditItem(item);
    this.editItems[item.id].productName = value;
  }

  setEditQuantity(item: any, value: any): void {
    this.ensureEditItem(item);
    this.editItems[item.id].quantity = Number(value || 1);
  }

  setEditUnitPrice(item: any, value: any): void {
    this.ensureEditItem(item);
    this.editItems[item.id].unitPrice = Number(value || 0);
  }

  ensureEditItem(item: any): void {
    if (!this.editItems[item.id]) {
      this.editItems[item.id] = {
        productName: item.productName,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        status: item.status || 'Active'
      };
    }
  }

  setAddProductName(order: any, value: string): void {
    this.ensureAddForm(order);
    this.addForms[order.id].productName = value;
  }

  setAddQuantity(order: any, value: any): void {
    this.ensureAddForm(order);
    this.addForms[order.id].quantity = Number(value || 1);
  }

  setAddUnitPrice(order: any, value: any): void {
    this.ensureAddForm(order);
    this.addForms[order.id].unitPrice = Number(value || 0);
  }

  ensureAddForm(order: any): void {
    if (!this.addForms[order.id]) {
      this.addForms[order.id] = {
        productName: '',
        quantity: 1,
        unitPrice: 0
      };
    }
  }

  saveItem(order: any, item: any): void {
    const editItem = this.editItems[item.id];

    if (!editItem) {
      return;
    }

    if (!editItem.productName || editItem.quantity <= 0 || editItem.unitPrice < 0) {
      this.alertService.error('Product name, quantity, and price must be valid.');
      return;
    }

    this.orderService.updateOrderItem(order.id, item.id, editItem).subscribe({
      next: response => {
        this.handleUpdatedOrder(response?.order);
        this.alertService.success('Item updated successfully.');
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  addItem(order: any): void {
    this.ensureAddForm(order);

    const addForm = this.addForms[order.id];

    if (!addForm.productName || addForm.quantity <= 0 || addForm.unitPrice < 0) {
      this.alertService.error('Product name, quantity, and price must be valid.');
      return;
    }

    this.orderService.addOrderItem(order.id, addForm).subscribe({
      next: response => {
        this.handleUpdatedOrder(response?.order);

        this.addForms[order.id] = {
          productName: '',
          quantity: 1,
          unitPrice: 0
        };

        this.alertService.success('Item added successfully.');
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  markItemNotAvailable(order: any, item: any): void {
    const confirmed = confirm(
      `Mark "${item.productName}" as Not Available and remove it from the total?`
    );

    if (!confirmed) {
      return;
    }

    this.orderService.cancelOrderItem(order.id, item.id).subscribe({
      next: response => {
        this.handleUpdatedOrder(response?.order);
        this.alertService.success('Item marked as Not Available.');
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  restoreItem(order: any, item: any): void {
    const restoredItem = {
      productName: item.productName,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      status: 'Active'
    };

    this.orderService.updateOrderItem(order.id, item.id, restoredItem).subscribe({
      next: response => {
        this.handleUpdatedOrder(response?.order);
        this.alertService.success('Item restored successfully.');
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  handleUpdatedOrder(updatedOrder: any): void {
    if (!updatedOrder) {
      this.load();
      return;
    }

    this.replaceOrder(updatedOrder);

    if (this.isEditing(updatedOrder)) {
      this.startEditOrder(updatedOrder);
    }
  }

  togglePreparedItem(order: any, item: any, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (!order?.id || !item?.id) {
      return;
    }

    if (!this.preparedItems[order.id]) {
      this.preparedItems[order.id] = {};
    }

    this.preparedItems[order.id][item.id] = checked;

    const key = this.getPreparedStorageKey(order, item);

    if (checked) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
  }

  isPreparedItemChecked(order: any, item: any): boolean {
    if (!order?.id || !item?.id) {
      return false;
    }

    return this.preparedItems[order.id]?.[item.id] === true;
  }

  getPreparedItemIds(order: any): number[] {
    if (!order?.id || !this.preparedItems[order.id]) {
      return [];
    }

    return Object.keys(this.preparedItems[order.id])
      .filter(itemId => this.preparedItems[order.id][Number(itemId)] === true)
      .map(itemId => Number(itemId));
  }

  getPreparedStorageKey(order: any, item: any): string {
    return `mygift-order-${order.id}-item-${item.id}-prepared`;
  }

  clearPreparedItems(order: any): void {
    if (!order?.id || !Array.isArray(order.items)) {
      return;
    }

    for (const item of order.items) {
      const key = this.getPreparedStorageKey(order, item);
      localStorage.removeItem(key);
    }

    delete this.preparedItems[order.id];
  }

  canMoveToReady(order: any): boolean {
    if (order.status !== 'Preparing') {
      return true;
    }

    const activeItems = this.getActiveItems(order);

    if (activeItems.length === 0) {
      return true;
    }

    return activeItems.every((item: any) =>
      this.isPreparedItemChecked(order, item)
    );
  }

  moveToNextStatus(order: any): void {
    if (order.status === 'Pending') {
      this.updateStatus(order, 'Preparing');
      return;
    }

    if (order.status === 'Preparing') {
      this.moveToReadyForPickup(order);
      return;
    }

    if (order.status === 'Ready for Pickup') {
      this.updateStatus(order, 'Completed');
      return;
    }
  }

  moveToReadyForPickup(order: any): void {
    if (!this.canMoveToReady(order)) {
      this.alertService.error(
        'Please check all available products first, or use Bypass Continue.'
      );
      return;
    }

    this.updateStatus(order, 'Ready for Pickup');
  }

  bypassToReadyForPickup(order: any): void {
    const confirmed = confirm(
      'Continue this order to Ready for Pickup? You can still edit or add items after bypassing.'
    );

    if (!confirmed) {
      return;
    }

    this.orderService.updateStatus(order.id, 'Ready for Pickup', [], true).subscribe({
      next: response => {
        const updatedOrder = response?.order;

        if (updatedOrder) {
          this.replaceOrder(updatedOrder);
        }

        this.clearPreparedItems(order);
        this.selectedStatus = 'Ready for Pickup';

        this.alertService.success(
          'Order moved to Ready for Pickup. You can still edit or add items if needed.'
        );
      },
      error: error => {
        this.alertService.error(this.getErrorMessage(error));
      }
    });
  }

  updateStatus(order: any, status: string): void {
    if (status === 'Cancelled') {
      const confirmed = confirm(`Cancel order ${order.orderCode}?`);

      if (!confirmed) {
        return;
      }
    }

    const preparedItemIds = this.getPreparedItemIds(order);

    this.orderService
      .updateStatus(order.id, status, preparedItemIds, false)
      .subscribe({
        next: response => {
          const updatedOrder = response?.order;

          if (updatedOrder) {
            this.replaceOrder(updatedOrder);
          } else {
            order.status = status;
          }

          if (
            status === 'Ready for Pickup' ||
            status === 'Completed' ||
            status === 'Cancelled'
          ) {
            this.clearPreparedItems(order);
          }

          this.selectedStatus = status;
          this.alertService.success('Order status updated successfully.');
        },
        error: error => {
          this.alertService.error(this.getErrorMessage(error));
        }
      });
  }

  replaceOrder(updatedOrder: any): void {
    this.orders = this.orders.map(order =>
      order.id === updatedOrder.id ? updatedOrder : order
    );
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