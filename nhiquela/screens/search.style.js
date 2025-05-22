import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    searchContainer:{
        flexDirection: "row",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 10,
        marginVertical: 9,
        marginTop: 21,
        marginHorizontal: 12,
        height: 50
        },
    searchIcon:{
        marginHorizontal: 10,
        color: "black",
        marginTop: 10
    },
    searchWrapper:{
        flex: 1,
        backgroundColor: "#F5F5F5",
        // marginRight: 5,
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
    },
    searchImage:{
        resizeMode:  "contain",
        width: 100,
        height: 100,
        alignContent: "center",
        alignItems: "center",
        marginTop: 220,
        opacity: 1
    },
    Text:{
        marginTop: 300,
        marginLeft: 130
    }
})


export default styles