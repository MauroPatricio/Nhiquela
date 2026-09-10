const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withCustomGradleHook(config) {
  return withProjectBuildGradle(config, async (config) => {
    let buildGradle = config.modResults.contents;
    if (!buildGradle.includes('patchGraphicsConversions')) {
      buildGradle += `\n
def patchGraphicsConversions() {
    try {
        def gradleCacheDir = new File(System.getProperty("user.home"), ".gradle/caches")
        if (gradleCacheDir.exists()) {
            gradleCacheDir.eachDir { versionDir ->
                if (versionDir.name.matches(/\\d+\\.\\d+(\\.\\d+)?/)) {
                    def transformsDir = new File(versionDir, "transforms")
                    if (transformsDir.exists()) {
                        transformsDir.eachFileRecurse { file ->
                            if (file.name == "graphicsConversions.h") {
                                try {
                                    def content = file.text
                                    if (content.contains('std::format("{}%", dimension.value)')) {
                                        file.text = content.replace('std::format("{}%", dimension.value)', 'std::to_string(dimension.value) + "%"')
                                        println("React Native Patch: Patched std::format in: " + file.absolutePath)
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (Exception e) {
        println("React Native Patch Error: " + e.message)
    }
}

allprojects {
    tasks.configureEach { task ->
        if (task.name.contains("CMake") || task.name.contains("generateCodegen") || task.name.contains("preBuild")) {
            task.doFirst {
                patchGraphicsConversions()
            }
        }
    }
}
`;
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};
