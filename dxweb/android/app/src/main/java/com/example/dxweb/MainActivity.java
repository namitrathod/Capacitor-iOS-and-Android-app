package com.example.dxweb;

import android.webkit.WebSettings;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * EC2 API uses http:// — WebView default https://localhost blocks that (mixed content).
 * Capacitor config also sets androidScheme + allowMixedContent; this enforces it on the WebView.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onResume() {
    super.onResume();
    Bridge bridge = getBridge();
    if (bridge != null && bridge.getWebView() != null) {
      bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
  }
}
