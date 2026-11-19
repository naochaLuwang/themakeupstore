package com.themakeupstorewangkhei.twa;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;
import com.ionicframework.capacitor.Checkout;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "push-notifications";
    private FrameLayout startup;
    private StoreWebViewClient storeClient;
    private BrandSplashView brandSplash;
    private int startupGeneration;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // One system-to-native handoff; Capacitor's separate timed splash is disabled.
        androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
        registerPlugin(Checkout.class);
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        if (getBridge() != null) {
            startup = new FrameLayout(this);
            startup.setBackgroundColor(Color.WHITE);
            startup.setClickable(true);
            addContentView(startup, new ViewGroup.LayoutParams(-1, -1));
            storeClient = new StoreWebViewClient(getBridge(), this);
            getBridge().setWebViewClient(storeClient);
        }
    }

    void showStartupLoading() {
        prepareStartup();
        brandSplash = new BrandSplashView(this);
        startup.addView(brandSplash, new FrameLayout.LayoutParams(-1, -1));
    }

    private void prepareStartup() {
        startupGeneration++;
        startup.animate().cancel();
        if (brandSplash != null) { brandSplash.stop(); brandSplash = null; }
        startup.removeAllViews();
        startup.setAlpha(1f);
        startup.setClickable(true);
        startup.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
        startup.setVisibility(View.VISIBLE);
    }

    void hideStartup() {
        if (startup == null || startup.getVisibility() != View.VISIBLE) return;
        int generation = startupGeneration;
        // The store is interactive immediately; the short crossfade does not block it.
        startup.setClickable(false);
        startup.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        Runnable finish = () -> {
            if (generation != startupGeneration) return;
            if (brandSplash != null) { brandSplash.stop(); brandSplash = null; }
            startup.setVisibility(View.GONE);
            startup.removeAllViews();
        };
        if (BrandSplashView.motionEnabled(this)) startup.animate().alpha(0f).setDuration(120).withEndAction(finish).start();
        else finish.run();
    }

    void showStartupRetry(Runnable retry) {
        if (startup == null) return;
        prepareStartup();
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        int padding = (int) (32 * getResources().getDisplayMetrics().density);
        content.setPadding(padding, padding, padding, padding);
        TextView title = new TextView(this);
        title.setText("The Makeup Store");
        title.setTextSize(24);
        title.setTextColor(Color.rgb(15, 23, 42));
        title.setGravity(Gravity.CENTER);
        content.addView(title);
        TextView message = new TextView(this);
        message.setText("The store is taking longer to open. Check your connection and try again.");
        message.setTextSize(16);
        message.setTextColor(Color.rgb(71, 85, 105));
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, padding / 2, 0, padding);
        content.addView(message);
        Button button = new Button(this);
        button.setText("Try again");
        button.setOnClickListener(view -> retry.run());
        content.addView(button);
        startup.addView(content, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
    }

    @Override
    public void onDestroy() {
        if (storeClient != null) storeClient.destroy();
        if (startup != null) startup.animate().cancel();
        if (brandSplash != null) brandSplash.stop();
        super.onDestroy();
    }

    // Created natively so pushes delivered before the first login (or after an
    // app data clear) still land on a valid channel instead of being dropped.
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Order updates and announcements");
            channel.enableVibration(true);
            channel.setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
            );
            manager.createNotificationChannel(channel);
        }
    }
}
