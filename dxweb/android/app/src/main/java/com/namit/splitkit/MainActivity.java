package com.namit.splitkit;

import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onResume() {
    super.onResume();
    // Allow mixed content when WebView origin differs from API scheme (e.g. https app vs http API).
    if (getBridge() != null && getBridge().getWebView() != null) {
      WebSettings settings = getBridge().getWebView().getSettings();
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
  }
}
