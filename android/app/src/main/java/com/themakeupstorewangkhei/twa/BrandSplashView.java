package com.themakeupstorewangkhei.twa;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.Animatable2;
import android.graphics.drawable.AnimatedVectorDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

/** Local native animation: no web assets, network request or minimum display time. */
final class BrandSplashView extends FrameLayout {
    private final AnimatedVectorDrawable mark;
    private final TextView name;
    private final TextView location;
    private boolean playing;
    private final Runnable repeat;
    private final Animatable2.AnimationCallback animationCallback;

    BrandSplashView(Context context) {
        super(context);
        setBackgroundColor(Color.WHITE);
        setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        setContentDescription("The Makeup Store, Wangkhei. Opening store.");

        ImageView image = new ImageView(context);
        mark = (AnimatedVectorDrawable) context.getDrawable(R.drawable.brand_mark_animated).mutate();
        image.setImageDrawable(mark);
        image.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        addView(image, new FrameLayout.LayoutParams(dp(288), dp(288), Gravity.CENTER));

        name = label("The Makeup Store", 22, Color.rgb(15, 23, 42));
        name.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        name.setTranslationY(dp(104));
        addView(name, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
        location = label("Wangkhei", 14, Color.rgb(100, 116, 139));
        location.setTranslationY(dp(136));
        addView(location, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));

        repeat = () -> { if (playing && isAttachedToWindow() && getWindowVisibility() == View.VISIBLE) mark.start(); };
        animationCallback = new Animatable2.AnimationCallback() {
            @Override public void onAnimationEnd(Drawable drawable) {
                if (playing) postDelayed(repeat, 900);
            }
        };
        mark.registerAnimationCallback(animationCallback);
    }

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(getContext());
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        view.setPadding(dp(20), 0, dp(20), 0);
        view.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        return view;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    static boolean motionEnabled(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return ValueAnimator.areAnimatorsEnabled();
        return Settings.Global.getFloat(context.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f;
    }

    private void play() {
        if (playing || !isAttachedToWindow()) return;
        if (!motionEnabled(getContext())) {
            name.setAlpha(1f);
            name.setTranslationY(dp(104));
            location.setAlpha(1f);
            return;
        }
        playing = true;
        mark.start();
        name.setAlpha(0f);
        name.setTranslationY(dp(110));
        name.animate().alpha(1f).translationY(dp(104)).setStartDelay(100).setDuration(280).start();
        location.setAlpha(0f);
        location.animate().alpha(1f).setStartDelay(180).setDuration(280).start();
    }

    void stop() {
        playing = false;
        removeCallbacks(repeat);
        mark.stop();
        name.animate().cancel();
        location.animate().cancel();
    }

    @Override protected void onAttachedToWindow() { super.onAttachedToWindow(); play(); }
    @Override protected void onDetachedFromWindow() { stop(); super.onDetachedFromWindow(); }
    @Override protected void onWindowVisibilityChanged(int visibility) {
        super.onWindowVisibilityChanged(visibility);
        // The framework can call this while the superclass constructor is running.
        if (mark == null) return;
        if (visibility == View.VISIBLE) play(); else stop();
    }
}
