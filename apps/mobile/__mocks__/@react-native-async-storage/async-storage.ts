// Manual mock, auto-applied: jest-expo does not stub AsyncStorage's native
// module, so every suite gets the in-memory mock the package ships.
export { default } from '@react-native-async-storage/async-storage/jest/async-storage-mock';
