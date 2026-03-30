import { Component } from '@angular/core';
import { DEVELOPER_CONTACT_EMAIL } from 'src/app/core/support.constants';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.sass'],
})
export class PrivacyComponent {
  readonly developerContactEmail = DEVELOPER_CONTACT_EMAIL;
}

