import { Component, OnInit } from '@angular/core';
import { AlertService } from '../_services/alert.service';

@Component({ selector: 'app-alert', templateUrl: './alert.component.html' })
export class AlertComponent implements OnInit {
  alerts: any[] = [];
  constructor(private alertService: AlertService) {}
  ngOnInit() {
    this.alertService.onAlert().subscribe(alert => {
      if (!alert) { this.alerts = []; return; }
      this.alerts = [alert];
      setTimeout(() => this.alerts = [], 5000);
    });
  }
  cssClass(alert: any) { return `alert alert-${alert.type} alert-dismissible mt-3`; }
  removeAlert(alert: any) { this.alerts = this.alerts.filter(x => x !== alert); }
}
