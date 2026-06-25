// src/components/SelectField.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../styles/colors';

// Interface genérica que funciona com qualquer formulário
interface SelectFieldProps<K extends string> {
  label: string;
  field: K;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (field: K, value: string) => void;
  onBlur?: (field: K) => void;
  error?: string;
  touched?: boolean;
  placeholder?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export default function SelectField<K extends string>({
  label,
  field,
  value,
  options,
  onChange,
  onBlur,
  error,
  touched = false,
  placeholder = "Selecione uma opção",
  icon = "chevron-down-outline",
}: SelectFieldProps<K>) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const showError = touched && error;

  const handleSelect = (selectedValue: string) => {
    onChange(field, selectedValue);
    setModalVisible(false);
    onBlur?.(field);
  };

  const handleOpen = () => {
    setModalVisible(true);
    onBlur?.(field);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, showError && styles.labelError]}>
        {label.includes('*') ? (
            <Text>
                {label.split('*')[0]}<Text style={{ color: 'red' }}>*</Text>{label.split('*')[1]}
            </Text>
        ) : (
            label
        )}
      </Text>
      
      <TouchableOpacity
        style={[
          styles.select,
          showError && styles.selectError,
        ]}
        onPress={handleOpen}
      >
        <View style={styles.selectContent}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color={showError ? COLORS.error : COLORS.primary} 
              style={styles.icon} 
            />
          )}
          <Text style={[
            styles.selectText,
            !value && styles.placeholderText,
            showError && styles.selectTextError,
          ]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Ionicons 
            name="chevron-down-outline" 
            size={20} 
            color={showError ? COLORS.error : "#64748B"} 
          />
        </View>
      </TouchableOpacity>

      {showError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    value === item.value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    value === item.value && styles.optionTextSelected,
                  ]}>
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  labelError: {
    color: COLORS.error,
  },
  select: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  selectError: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999',
    fontWeight: '400',
  },
  selectTextError: {
    color: COLORS.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionSelected: {
    backgroundColor: '#F0F9FF',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});