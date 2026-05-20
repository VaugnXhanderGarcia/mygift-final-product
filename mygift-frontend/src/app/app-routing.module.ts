import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicOrderComponent } from './public/public-order.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminProductsComponent } from './admin-products/admin-products.component';
import { AdminOrdersComponent } from './admin-orders/admin-orders.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { AuthGuard } from './_helpers/auth.guard';
import { TrackOrderComponent } from './track-order/track-order.component';

const routes: Routes = [
  { path: '', component: PublicOrderComponent },
  { path: 'track-order', component: TrackOrderComponent },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin/products', component: AdminProductsComponent, canActivate: [AuthGuard] },
  { path: 'admin/orders', component: AdminOrdersComponent, canActivate: [AuthGuard] },
  { path: 'admin/profile', component: AdminProfileComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule {}
