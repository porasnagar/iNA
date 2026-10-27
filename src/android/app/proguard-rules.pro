# Hidden Bluetooth APIs are called through reflection (Tier 2 L2CAP + profile connect).
-keepclassmembers class android.bluetooth.BluetoothDevice { *** createL2capSocket(int); }
-keepclassmembers class android.bluetooth.BluetoothA2dp { *** connect(android.bluetooth.BluetoothDevice); }
-keepclassmembers class android.bluetooth.BluetoothHeadset { *** connect(android.bluetooth.BluetoothDevice); }


