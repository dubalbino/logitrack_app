import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { locationService } from '../services/locationService';

interface Delivery {
  id: string;
  data_pedido: string;
  previsao_entrega: string;
  descricao_compra: string;
  valor: number;
  cliente_id: string; 
  entregador_id: string; 
  situacao_pedido: 'pedido_confirmado' | 'pronto_envio' | 'enviado' | 'entrega_realizada' | 'entrega_sem_sucesso' | 'devolvido_remetente' | 'avariado' | 'extravio';
  origem: string;
  destino: string;
  codigo_rastreio?: string | null;
  user_id?: string | null;
}

const DeliveryCard = ({ delivery, onPress }: { delivery: Delivery, onPress: () => void }) => {
  const todayString = new Date().toISOString().substring(0, 10);
  const deliveryDateString = new Date(delivery.previsao_entrega).toISOString().substring(0, 10);

  let isLate = false;
  if (delivery.situacao_pedido !== 'entrega_realizada') {
    isLate = deliveryDateString < todayString;
  }

  let statusText = '';
  let statusStyle = {};

  if (delivery.situacao_pedido === 'entrega_realizada') {
    statusText = 'Concluído';
    statusStyle = deliveryCardStyles.completedStatus;
  } else if (isLate) {
    statusText = 'Atrasado';
    statusStyle = deliveryCardStyles.lateStatus;
  } else {
    statusText = 'No Prazo';
    statusStyle = deliveryCardStyles.onTimeStatus;
  }

  return (
    <TouchableOpacity onPress={onPress} style={deliveryCardStyles.card}>
      <Text style={deliveryCardStyles.deliveryNumber}># {delivery.id}</Text>
      <Text style={statusStyle}>
        {statusText}
      </Text>
      <Text style={deliveryCardStyles.status}>Situação: {delivery.situacao_pedido}</Text>
      <Text style={deliveryCardStyles.address}>Origem: {delivery.origem}</Text>
      <Text style={deliveryCardStyles.address}>Destino: {delivery.destino}</Text>
      <Text style={deliveryCardStyles.description}>{delivery.descricao_compra}</Text>
      <Text style={deliveryCardStyles.date}>Pedido em: {new Date(delivery.data_pedido).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Text>
      <Text style={deliveryCardStyles.date}>Previsão: {new Date(delivery.previsao_entrega).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</Text>
      
      {delivery.situacao_pedido === 'pronto_envio' && (
        <TouchableOpacity 
          style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, marginTop: 10 }}
          onPress={async (e) => {
            e.stopPropagation();
            Alert.alert('Teste', 'Iniciando rastreamento...');
            const success = await locationService.startTracking(delivery.id);
            if (success) {
              Alert.alert('Sucesso!', 'Rastreamento iniciado! Verifique o console e o Supabase.');
            } else {
              Alert.alert('Erro', 'Não conseguiu iniciar rastreamento.');
            }
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>🚚 TESTAR RASTREAMENTO</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [user, setUser] = useState<any>(null);
  const [entregadorId, setEntregadorId] = useState<string | null>(null);

  useEffect(() => {
    const setup = async () => {
      setLoading(true);
      const { data: { user: fetchedUser } } = await supabase.auth.getUser();
      setUser(fetchedUser);

      if (!fetchedUser) {
        Alert.alert('Erro', 'Usuário não logado.');
        setLoading(false);
        return;
      }

      const userName = fetchedUser.user_metadata?.full_name;

      if (!userName) {
        Alert.alert('Erro', 'Nome de usuário não disponível para comparação.');
        setLoading(false);
        return;
      }

      const { data: entregadorData, error: entregadorError } = await supabase
        .from('entregadores')
        .select('id')
        .eq('nome', userName)
        .single();

      if (entregadorError && entregadorError.code !== 'PGRST116') {
        throw entregadorError;
      }

      if (!entregadorData) {
        Alert.alert('Aviso', `Nenhum entregador encontrado com o nome '${userName}'.`);
        setDeliveries([]);
        setLoading(false);
        return;
      }
      setEntregadorId(entregadorData.id);
      await fetchDeliveries(entregadorData.id);

      const subscription = supabase
        .channel('public:entregas')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'entregas',
            filter: `entregador_id=eq.${entregadorData.id}`
          },
          (payload) => {
            fetchDeliveries(entregadorData.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };

    setup();
  }, []);

  const fetchDeliveries = async (currentEntregadorId: string) => {
    try {
      if (!currentEntregadorId) {
        return;
      }

      const { data, error } = await supabase
        .from('entregas')
        .select('*')
        .eq('entregador_id', currentEntregadorId);

      if (error) {
        throw error;
      }

      if (data) {
        const sortedDeliveries = (data as Delivery[]).sort((a, b) => {
          const dateA = new Date(a.previsao_entrega).getTime();
          const dateB = new Date(b.previsao_entrega).getTime();
          return dateA - dateB;
        });
        setDeliveries(sortedDeliveries);
      }
    } catch (error: any) {
      Alert.alert('Erro ao carregar entregas', error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDeliveryDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsModalVisible(true);
  };

  const closeDeliveryDetails = () => {
    setIsModalVisible(false);
    setSelectedDelivery(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6a0dad" />
        <Text style={styles.loadingText}>Carregando entregas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Minhas Entregas</Text>
      {deliveries.length === 0 ? (
        <Text style={styles.noDeliveriesText}>Nenhuma entrega encontrada.</Text>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DeliveryCard delivery={item} onPress={() => openDeliveryDetails(item)} />}
          contentContainerStyle={styles.flatListContent}
        />
      )}

      {selectedDelivery && (
        <DeliveryDetailsModal
          isVisible={isModalVisible}
          onClose={closeDeliveryDetails}
          delivery={selectedDelivery}
          onUpdateDelivery={() => fetchDeliveries(entregadorId!)}
        />
      )}
    </View>
  );
}

const deliveryCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  deliveryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  address: {
    fontSize: 14,
    color: '#777',
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#777',
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  completedStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 5,
  },
  lateStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D9534F',
    marginBottom: 5,
  },
  onTimeStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5CB85C',
    marginBottom: 5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  flatListContent: {
    paddingBottom: 10,
  },
  noDeliveriesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#fff',
  },
});

interface DeliveryDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  delivery: Delivery;
  onUpdateDelivery: () => void;
}

const DeliveryDetailsModal = ({ isVisible, onClose, delivery, onUpdateDelivery }: DeliveryDetailsModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<Delivery['situacao_pedido']>(delivery.situacao_pedido);

  useEffect(() => {
    setSelectedStatus(delivery.situacao_pedido);
  }, [delivery]);

  const handleUpdateStatus = async () => {
    try {
      const updates: any = { situacao_pedido: selectedStatus };
      
      // Se mudou para "entrega_realizada" ou "entrega_sem_sucesso", desativar tracking
      if (selectedStatus === 'entrega_realizada' || selectedStatus === 'entrega_sem_sucesso') {
        updates.tracking_ativo = false;
        updates.data_entrega = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('entregas')
        .update(updates)
        .eq('id', delivery.id);

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Status da entrega atualizado com sucesso!');
      onUpdateDelivery();
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', `Erro ao atualizar status: ${error.message}`);
    }
  };

  const statusOptions: Delivery['situacao_pedido'][] = [
    'pedido_confirmado',
    'pronto_envio',
    'enviado',
    'entrega_realizada',
    'entrega_sem_sucesso',
  ];

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={modalStyles.modal}
    >
      <View style={modalStyles.modalContent}>
        <Text style={modalStyles.modalTitle}>Detalhes da Entrega</Text>
        <Text style={modalStyles.modalText}>Status Atual: {delivery.situacao_pedido}</Text>
        <Text style={modalStyles.modalText}>Origem: {delivery.origem}</Text>
        <Text style={modalStyles.modalText}>Destino: {delivery.destino}</Text>
        <Text style={modalStyles.modalText}>Item: {delivery.descricao_compra}</Text>
        <Text style={modalStyles.modalText}>Data do Pedido: {new Date(delivery.data_pedido).toLocaleString('pt-BR', { timeZone: 'UTC' })}</Text>
        <Text style={modalStyles.modalText}>Previsão de Entrega: {new Date(delivery.previsao_entrega).toLocaleString('pt-BR', { timeZone: 'UTC' })}</Text>
        {delivery.codigo_rastreio && <Text style={modalStyles.modalText}>Código de Rastreio: {delivery.codigo_rastreio}</Text>}

        <Text style={modalStyles.label}>Alterar Status:</Text>
        <View style={modalStyles.pickerContainer}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={(itemValue) => setSelectedStatus(itemValue)}
            style={modalStyles.picker}
            itemStyle={modalStyles.pickerItem}
          >
            {statusOptions.map((status) => (
              <Picker.Item key={status} label={status.replace(/_/g, ' ').toUpperCase()} value={status} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={modalStyles.updateButton} onPress={handleUpdateStatus}>
          <Text style={modalStyles.updateButtonText}>Atualizar Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
          <Text style={modalStyles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  pickerContainer: {
    width: '90%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
  },
  updateButton: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});