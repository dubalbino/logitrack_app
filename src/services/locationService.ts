// src/services/locationService.ts
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private isTracking: boolean = false;
  private currentEntregaId: string | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.error('Permissão de localização negada');
      return false;
    }

    return true;
  }

  async startTracking(entregaId: string): Promise<boolean> {
    // SE JÁ ESTÁ RASTREANDO, PARAR ANTES
    if (this.isTracking && this.currentEntregaId) {
      console.log('Parando rastreamento anterior:', this.currentEntregaId);
      await this.stopTracking(this.currentEntregaId, 'enviado', false);
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return false;
    }

    try {
      // Atualizar status da entrega para "enviado" e marcar tracking como ativo
      await supabase
        .from('entregas')
        .update({ 
          situacao_pedido: 'enviado',
          tracking_ativo: true,
          tracking_iniciado_em: new Date().toISOString()
        })
        .eq('id', entregaId);

      // Iniciar rastreamento a cada 5 segundos
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          await this.sendLocationToServer(entregaId, location);
        }
      );

      this.isTracking = true;
      this.currentEntregaId = entregaId;
      console.log('✅ Rastreamento iniciado para entrega:', entregaId);
      return true;

    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      return false;
    }
  }

  async stopTracking(
    entregaId: string, 
    status: 'entrega_realizada' | 'entrega_sem_sucesso' | 'enviado' = 'entrega_realizada',
    updateStatus: boolean = true
  ): Promise<void> {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    this.isTracking = false;
    this.currentEntregaId = null;

    if (updateStatus) {
      await supabase
        .from('entregas')
        .update({ 
          situacao_pedido: status,
          tracking_ativo: false,
          data_entrega: new Date().toISOString()
        })
        .eq('id', entregaId);
    } else {
      await supabase
        .from('entregas')
        .update({ 
          tracking_ativo: false
        })
        .eq('id', entregaId);
    }

    console.log('❌ Rastreamento parado para entrega:', entregaId);
  }

  private async sendLocationToServer(
    entregaId: string, 
    location: Location.LocationObject
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('entregas_rastreamento')
        .insert({
          entrega_id: parseInt(entregaId),
          motorista_lat: location.coords.latitude,
          motorista_lng: location.coords.longitude,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Erro ao enviar localização:', error);
      } else {
        console.log('📍 Localização enviada:', {
          lat: location.coords.latitude.toFixed(6),
          lng: location.coords.longitude.toFixed(6)
        });
      }
    } catch (error) {
      console.error('Erro ao enviar localização:', error);
    }
  }

  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  getCurrentEntregaId(): string | null {
    return this.currentEntregaId;
  }
}

export const locationService = new LocationService();