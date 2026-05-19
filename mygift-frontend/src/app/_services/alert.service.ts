import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private subject = new Subject<any>();
  onAlert() { return this.subject.asObservable(); }
  success(message: string) { this.subject.next({ type: 'success', message }); }
  error(message: string) { this.subject.next({ type: 'danger', message }); }
  clear() { this.subject.next(null); }
}
