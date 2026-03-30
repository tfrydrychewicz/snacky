import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScannerScreen } from '~/features/scanner/screens/ScannerScreen';
import { ScanResultsScreen } from '~/features/scanner/screens/ScanResultsScreen';
import { BarcodeResultScreen } from '~/features/scanner/screens/BarcodeResultScreen';
import type { ScannerStackParamList } from './types';

const Stack = createNativeStackNavigator<ScannerStackParamList>();

export const ScannerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Capture" component={ScannerScreen} />
    <Stack.Screen name="Results" component={ScanResultsScreen} />
    <Stack.Screen name="BarcodeResult" component={BarcodeResultScreen} />
  </Stack.Navigator>
);
