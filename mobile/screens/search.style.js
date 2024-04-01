import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    searchContainer:{
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        marginVertical: 9,
        marginTop: 21
    },
    searchIcon:{
        marginHorizontal: 10,
        color: "black",
        marginTop: 10
    },
    searchWrapper:{
        flex: 1,
        backgroundColor: "red",
        marginRight: 5,
        borderRadius: 2
    },
    searchInput: {
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 9
    },
    searchBtn:{
        width: 50,
        height: "100%",
        borderRadius: 12,
         alignItems: "center",
         marginTop: 10 
    }
})


export default styles