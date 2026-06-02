import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSplash } from './src/components/AppSplash';

/**
 * Register a tiny root first so `main` is always registered. The real `App` is
 * imported asynchronously. If a dependency throws during static import of App.tsx,
 * Metro often shows nothing while the native shell says "main" was not registered.
 */
function Bootstrap() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType<object> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    import('./App')
      .then((m) => {
        setAppComponent(() => m.default);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : '';
        console.error('[Smash or Pass] Failed to load App:', msg, stack);
        setLoadError(`${msg}\n\n${stack ?? ''}`);
      });
  }, []);

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Could not load app JavaScript</Text>
        <ScrollView style={styles.scroll}>
          <Text selectable style={styles.errBody}>
            {loadError}
          </Text>
        </ScrollView>
        <Text style={styles.hint}>Also check the Metro terminal for a red ERROR block.</Text>
      </View>
    );
  }

  if (!AppComponent) {
    return <AppSplash />;
  }

  return <AppComponent />;
}

registerRootComponent(Bootstrap);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#FAFAFA' },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#C62828', marginBottom: 12, textAlign: 'center' },
  scroll: { maxHeight: '70%', width: '100%' },
  errBody: { fontFamily: 'Courier', fontSize: 12, color: '#1A1A1A' },
  hint: { marginTop: 16, fontSize: 12, color: '#5C6670', textAlign: 'center' },
});
