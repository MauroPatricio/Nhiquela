import {TouchableOpacity } from 'react-native'
import React from 'react'
import {Ionicons} from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
const BackBtn = ({onPress}) => {
  return (
    <SafeAreaView>

   <TouchableOpacity onPress={onPress}>
            <Ionicons name = 'chevron-back-circle'
            size={40}
            color={"#7F00FF"}
            style
            />
   </TouchableOpacity>
    </SafeAreaView>
  )
}

export default BackBtn