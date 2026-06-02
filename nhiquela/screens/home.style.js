import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    textStyle: {
        fontFamily: "bold",
        fontSize: 40
    },
    appBarWrapper: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: "white",
    },
    appBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    userInfoContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    cover: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: "#7F00FF",
    },
    textContainer: {
        marginLeft: 12,
    },
    greetingText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    location: {
        fontSize: 16,
        color: "#1F2937",
        fontWeight: "700",
        textAlign: "left",
        marginTop: 1,
    },
    appBarRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    cartBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    cartCount: {
        position: "absolute",
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#7F00FF",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        borderWidth: 2,
        borderColor: "white",
    },
    cartNumber: {
        fontWeight: "700",
        fontSize: 9,
        color: "white",
    }
});

export default styles;