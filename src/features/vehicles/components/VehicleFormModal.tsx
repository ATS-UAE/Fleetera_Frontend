import type { Vehicle } from '@/types';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Modal, TextInput, Select, NumberInput, Button, Group, Textarea, SimpleGrid } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { addVehicle, updateVehicle } from '@/store/slices/vehiclesSlice';

const VEHICLE_TYPES = ['Heavy Truck', 'Van', 'Sedan', 'Bus', 'Pickup', 'SUV', 'Motorcycle', 'Other'];
const STATUS_OPTIONS = ['moving', 'idle', 'stopped', 'offline', 'maintenance'];
const GROUP_OPTIONS = [
  { value: 'g1', label: 'Northern Fleet' },
  { value: 'g2', label: 'Southern Fleet' },
  { value: 'g3', label: 'Maintenance Bay' },
];

interface VehicleFormModalProps {
  opened: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}
export default function VehicleFormModal({ opened, onClose, vehicle }: VehicleFormModalProps) {
  const dispatch = useDispatch();
  const isEdit = !!vehicle;

  const form = useForm({
    initialValues: {
      name: '', plate: '', type: 'Sedan', make: '', model: '',
      year: 2024, fuel: 100, status: 'stopped', groupId: 'g1',
      sim: '', imei: '', insurance: '', service: '',
      lat: 7.2906, lng: 80.6337,
    },
  });

  useEffect(() => {
    if (vehicle) form.setValues(vehicle);
    else form.reset();
  }, [vehicle, opened]);

  const handleSubmit = (values) => {
    if (isEdit) {
      dispatch(updateVehicle({ ...vehicle, ...values }));
      notifications.show({ title: 'Vehicle updated', message: `${values.name} has been updated.`, color: 'blue' });
    } else {
      dispatch(addVehicle({ ...values, speed: 0, odometer: 0, heading: 0, engineOn: false, ignition: false, track: [], lastUpdate: new Date().toISOString() }));
      notifications.show({ title: 'Vehicle added', message: `${values.name} has been added to the fleet.`, color: 'green' });
    }
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit — ${vehicle?.name}` : 'Add New Vehicle'}
      size="lg"
      zIndex={2000}
      styles={{ title: { fontWeight: 700, fontSize: '15px' } }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <SimpleGrid cols={2} spacing="sm">
          <TextInput label="Vehicle Name" placeholder="TRK-001" required {...form.getInputProps('name')} />
          <TextInput label="License Plate" placeholder="WP-CAB-1234" required {...form.getInputProps('plate')} />
          <Select label="Type" data={VEHICLE_TYPES} required {...form.getInputProps('type')} />
          <Select label="Fleet Group" data={GROUP_OPTIONS} {...form.getInputProps('groupId')} />
          <TextInput label="Make" placeholder="Volvo" {...form.getInputProps('make')} />
          <TextInput label="Model" placeholder="FH16" {...form.getInputProps('model')} />
          <NumberInput label="Year" min={2000} max={2030} {...form.getInputProps('year')} />
          <Select label="Status" data={STATUS_OPTIONS} {...form.getInputProps('status')} />
          <NumberInput label="Fuel %" min={0} max={100} {...form.getInputProps('fuel')} />
          <TextInput label="SIM Number" placeholder="+94771234567" {...form.getInputProps('sim')} />
          <TextInput label="IMEI" placeholder="356938035643809" {...form.getInputProps('imei')} />
          <TextInput label="Insurance Expiry" placeholder="2025-12-31" {...form.getInputProps('insurance')} />
          <TextInput label="Service Due" placeholder="2024-08-15" {...form.getInputProps('service')} />
        </SimpleGrid>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" color="blue">{isEdit ? 'Save Changes' : 'Add Vehicle'}</Button>
        </Group>
      </form>
    </Modal>
  );
}
