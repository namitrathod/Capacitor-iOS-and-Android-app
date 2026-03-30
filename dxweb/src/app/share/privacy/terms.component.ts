import { Component } from '@angular/core';
import { DEVELOPER_CONTACT_EMAIL } from 'src/app/core/support.constants';

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.sass'],
})
export class TermsComponent {
  readonly developerContactEmail = DEVELOPER_CONTACT_EMAIL;
}

