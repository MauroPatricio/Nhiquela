const fs = require('fs');

const filepath = 'App.js';
let content = fs.readFileSync(filepath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add Import
if (!content.includes('import OnboardingScreen')) {
    content = content.replace(
        "import DocumentUploadScreen from './screens/DocumentUploadScreen';",
        "import DocumentUploadScreen from './screens/DocumentUploadScreen';\nimport OnboardingScreen from './screens/OnboardingScreen';"
    );
}

// 2. Add State
if (!content.includes('isFirstLaunch')) {
    content = content.replace(
        "const [configLoading, setConfigLoading] = React.useState(true);",
        "const [configLoading, setConfigLoading] = React.useState(true);\n  const [isFirstLaunch, setIsFirstLaunch] = React.useState(null);"
    );
}

// 3. Check AsyncStorage
if (!content.includes('hasViewedOnboarding')) {
    content = content.replace(
        "setConfigLoading(false);",
        "const hasViewed = await AsyncStorage.getItem('@hasViewedOnboarding');\n        setIsFirstLaunch(hasViewed === null);\n        setConfigLoading(false);"
    );
}

// 4. Return Null while loading
if (!content.includes('if (isFirstLaunch === null) return null;')) {
    content = content.replace(
        "// Ecrã de bloqueio",
        "// Wait for first launch check\n  if (isFirstLaunch === null) return null;\n\n  // Ecrã de bloqueio"
    );
}

// 5. Update Navigator
if (!content.includes('initialRouteName={isFirstLaunch ? \'Onboarding\' : \'BottomNavigation\'}')) {
    content = content.replace(
        "<Stack.Navigator screenOptions={{ headerShown: false }}>",
        "<Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isFirstLaunch ? 'Onboarding' : 'BottomNavigation'}>\n              <Stack.Screen name=\"Onboarding\" component={OnboardingScreen} />"
    );
}

fs.writeFileSync(filepath, content);
console.log('App.js patched successfully!');
