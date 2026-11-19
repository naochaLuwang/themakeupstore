# Capacitor plugins use reflection
-keep class com.getcapacitor.** { *; }
-keep class com.google.gson.** { *; }
-keep class * extends com.getcapacitor.Plugin

# Firebase Cloud Messaging
-keep class com.google.firebase.** { *; }

# Google One Tap Auth
-keep class com.proventask.capacitor.googleauth.** { *; }

# Keep JavascriptInterface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Gson serialization models
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Razorpay Checkout
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}

# Keep R8 from stripping generic signatures
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
