const fs = require('fs');

const filepath = 'App.js';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add Import
if (!content.includes('import OnboardingScreen')) {
    content = content.replace(
        "import WithdrawalRequestsScreen from './components/WithdrawalRequests';",
        "import WithdrawalRequestsScreen from './components/WithdrawalRequests';\nimport OnboardingScreen from './screens/OnboardingScreen';"
    );
}

// 2. Add State inside AppContent
if (!content.includes('const [isFirstLaunch')) {
    content = content.replace(
        "const toast = useToast(); // ✔️ Hook para usar o toast",
        "const toast = useToast(); // ✔️ Hook para usar o toast\n  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);"
    );
}

// 3. Check AsyncStorage in useEffect
if (!content.includes('hasViewedOnboardingSeller')) {
    content = content.replace(
        "const setupNotifications = async () => {",
        "const checkOnboarding = async () => {\n      const hasViewed = await AsyncStorage.getItem('@hasViewedOnboardingSeller');\n      setIsFirstLaunch(hasViewed === null);\n    };\n    checkOnboarding();\n\n    const setupNotifications = async () => {"
    );
}

// 4. Return Null while loading
if (!content.includes('if (isFirstLaunch === null) return null;')) {
    content = content.replace(
        "return (",
        "if (isFirstLaunch === null) return null;\n\n  return ("
    );
}

// 5. Update Navigator
if (!content.includes('initialRouteName={isFirstLaunch ? \'Onboarding\' : \'BottomNavigation\'}')) {
    content = content.replace(
        "<Stack.Navigator>",
        "<Stack.Navigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'BottomNavigation'}>\n                <Stack.Screen name=\"Onboarding\" component={OnboardingScreen} options={{ headerShown: false }} />"
    );
}

fs.writeFileSync(filepath, content);
console.log('Seller App.js patched successfully!');
