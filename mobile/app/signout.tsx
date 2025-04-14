import { StyleSheet, View } from 'react-native';
import { SignOut } from '../components/SignOut';

export default function SignOutPage() {
    return (
        <View style={styles.container}>
            <SignOut />
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