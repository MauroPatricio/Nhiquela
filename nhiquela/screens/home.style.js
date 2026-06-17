import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    textStyle: {
        fontFamily: "bold",
        fontSize: 40
    },
    appBarWrapper: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
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
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6', // Fundo leve caso a imagem falhe
    },
    textContainer: {
        marginLeft: 14,
    },
    greetingText: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    location: {
        fontSize: 18,
        color: "#1A1A1A",
        fontWeight: "800",
        marginTop: 2,
    },
    appBarRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    cartBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        borderWidth: 1,
        borderColor: "#F0F2F5",
    },
    cartCount: {
        position: "absolute",
        top: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#9333EA",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
        borderWidth: 2,
        borderColor: "white",
    },
    cartNumber: {
        fontWeight: "bold",
        fontSize: 10,
        color: "white",
    }
});

export default styles;