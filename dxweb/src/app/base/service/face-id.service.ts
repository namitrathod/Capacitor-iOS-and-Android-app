import { Injectable } from '@angular/core';
import { Plugins } from '@capacitor/core';

const FACE_ID_ENABLED_KEY = 'splitkit_face_id_enabled';

@Injectable({
  providedIn: 'root',
})
export class FaceIdService {
  private get faceIdPlugin(): any {
    // The FaceId plugin is registered by the native Capacitor plugin.
    // On web/without the plugin, this will be undefined.
    return (Plugins as any)?.FaceId;
  }

  isEnabled(): boolean {
    try {
      return localStorage.getItem(FACE_ID_ENABLED_KEY) === '1';
    } catch {
      return false;
    }
  }

  setEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(FACE_ID_ENABLED_KEY, enabled ? '1' : '0');
    } catch {
      // ignore (e.g. private mode)
    }
  }

  async isAvailable(): Promise<boolean> {
    const faceId = this.faceIdPlugin;
    if (!faceId?.isAvailable) return false;

    try {
      const res = await faceId.isAvailable();
      // capacitor-face-id returns { value: string } (e.g. 'face'/'touch')
      return Boolean(res?.value);
    } catch {
      return false;
    }
  }

  async authenticate(reason: string): Promise<boolean> {
    const faceId = this.faceIdPlugin;
    if (!faceId?.auth) return false;

    await faceId.auth({ reason });
    return true;
  }
}

