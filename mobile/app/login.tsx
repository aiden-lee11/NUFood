import { StyleSheet, View } from 'react-native';
import { Login } from '../components/Login';

export default function LoginPage() {
    return (
        <View style={styles.container}>
            <Login />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
}); 