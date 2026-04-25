import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MarkAttendanceScreen from '../screens/MarkAttendanceScreen';
import MyAttendanceScreen from '../screens/MyAttendanceScreen';
import MySalaryScreen from '../screens/MySalaryScreen';
import EmployeesScreen from '../screens/EmployeesScreen';
import EmployeeFormScreen from '../screens/EmployeeFormScreen';
import BorrowFormScreen from '../screens/BorrowFormScreen';
import SalaryDetailScreen from '../screens/SalaryDetailScreen';
import AttendanceTodayScreen from '../screens/AttendanceTodayScreen';
import BorrowedPetrolScreen from '../screens/BorrowedPetrolScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SalaryManagementScreen from '../screens/SalaryManagementScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
            <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
            <Stack.Screen name="MySalary" component={MySalaryScreen} />
            <Stack.Screen name="Employees" component={EmployeesScreen} />
            <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
            <Stack.Screen name="AttendanceToday" component={AttendanceTodayScreen} />
            <Stack.Screen name="BorrowedPetrol" component={BorrowedPetrolScreen} />
            <Stack.Screen name="BorrowForm" component={BorrowFormScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="SalaryManagement" component={SalaryManagementScreen} />
            <Stack.Screen name="SalaryDetail" component={SalaryDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
});
