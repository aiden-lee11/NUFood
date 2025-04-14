import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Banner } from '../components/banner';
import { DataLoader } from '../components/data-loader';
import { HeaderControls } from '../components/header-controls';
import { AuthProvider } from '../context/AuthContext';
import { BannerProvider } from '../context/BannerContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <BannerProvider>
        <DataLoader>
          <View style={styles.container}>
            <View style={styles.header}>
              <HeaderControls />
            </View>
            <Banner />
            <Stack
              screenOptions={{
                headerShown: false,
              }}
            />
          </View>
        </DataLoader>
      </BannerProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
