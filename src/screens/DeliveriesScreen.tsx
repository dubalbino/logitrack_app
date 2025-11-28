import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal'; // Importar react-native-modal
import { Picker } from '@react-native-picker/picker'; // Nova importação para Picker
import { supabase } from '../lib/supabase';

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
    // Compara as strings de data YYYY-MM-DD
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
    </TouchableOpacity>
  );
};

export default function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [user, setUser] = useState<any>(null); // Adicionado para armazenar o usuário logado
  const [entregadorId, setEntregadorId] = useState<string | null>(null); // Adicionado para armazenar o ID do entregador

  // Efeito para carregar as entregas e configurar a subscription em tempo real
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
      await fetchDeliveries(entregadorData.id); // Chamar fetchDeliveries com o ID do entregador

      const subscription = supabase
        .channel('public:entregas')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'entregas',
            filter: `entregador_id=eq.${entregadorData.id}` // Adicionando filtro aqui!
          },
          (payload) => {
            fetchDeliveries(entregadorData.id); // Recarrega as entregas
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
      // setLoading(true); // Removido para evitar piscar na atualização em tempo real
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
        // Ordenar as entregas por previsao_entrega
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
          onUpdateDelivery={() => fetchDeliveries(entregadorId!)} // Passar a função de atualização com o ID do entregador
        />
      )}
    </View>
  );
}

const deliveryCardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#e0e0e0', // Fundo cinza claro
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000', // Sombra projetada
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  deliveryNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333', // Cinza escuro para contraste
    marginBottom: 5,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555', // Cinza médio para contraste
  },
  address: {
    fontSize: 14,
    color: '#777', // Cinza para contraste
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#777', // Cinza para contraste
    marginBottom: 5,
  },
  date: {
    fontSize: 12,
    color: '#999', // Cinza claro para contraste
    textAlign: 'right',
  },
  completedStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF', // Um azul para concluído
    marginBottom: 5,
  },
  lateStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D9534F', // Um vermelho mais suave
    marginBottom: 5,
  },
  onTimeStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5CB85C', // Um verde mais suave
    marginBottom: 5,
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#6a0dad', // Roxo principal da tela de login
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6a0dad', // Roxo principal
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff', // Branco para contraste
  },
  title: {
    fontSize: 28, // Aumentado um pouco para dar mais destaque
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff', // Branco para contraste
  },
  flatListContent: {
    paddingBottom: 10,
  },
  noDeliveriesText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#fff', // Branco para contraste
  },
});

import React, { useEffect, useState } from 'react';

interface DeliveryDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  delivery: Delivery;
  onUpdateDelivery: () => void; // Nova prop para atualizar a lista de entregas
}

const DeliveryDetailsModal = ({ isVisible, onClose, delivery, onUpdateDelivery }: DeliveryDetailsModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<Delivery['situacao_pedido']>(delivery.situacao_pedido);

  useEffect(() => {
    setSelectedStatus(delivery.situacao_pedido);
  }, [delivery]);

  const handleUpdateStatus = async () => {
    try {
      const { error } = await supabase
        .from('entregas')
        .update({ situacao_pedido: selectedStatus })
        .eq('id', delivery.id);

      if (error) {
        throw error;
      }

      Alert.alert('Sucesso', 'Status da entrega atualizado com sucesso!');
      onUpdateDelivery(); // Chamar a função para atualizar a lista na tela principal
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
    backgroundColor: '#4CAF50', // Um verde para o botão de atualização
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
    backgroundColor: '#6a0dad',
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