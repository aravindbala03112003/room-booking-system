import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const AdminRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price_per_night: '',
    image_url: '',
    total_rooms: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/rooms');
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
      setError('Unable to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openAddModal = () => {
    setEditingRoom(null);
    setFormData({
      title: '',
      description: '',
      price_per_night: '',
      image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      total_rooms: 1,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setEditingRoom(room);
    setFormData({
      title: room.title,
      description: room.description,
      price_per_night: room.price_per_night,
      image_url: room.image_url,
      total_rooms: room.total_rooms,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      if (editingRoom) {
        // Update room
        const response = await axiosClient.put(`/rooms/${editingRoom.id}`, formData);
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? response.data.room : r))
        );
      } else {
        // Create new room
        const response = await axiosClient.post('/rooms', formData);
        setRooms((prev) => [...prev, response.data.room]);
      }
      closeModal();
    } catch (err) {
      console.error('Save room error:', err);
      setModalError(err.response?.data?.message || 'Failed to save room details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axiosClient.delete(`/rooms/${id}`);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete room:', err);
      alert(err.response?.data?.message || 'Could not delete room.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--color-primary)' }}>
            Room Management
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Create, update, and manage your hotel's suites and inventory
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-accent" id="btn-add-room">
          <Plus size={18} />
          <span>Add New Room</span>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading rooms...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Room / Suite</th>
                <th>Price / Night</th>
                <th>Inventory (Total Units)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} id={`admin-room-row-${room.id}`}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img
                        src={room.image_url}
                        alt={room.title}
                        style={{ width: '64px', height: '48px', objectFit: 'cover', borderRadius: '8px' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {room.title}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '380px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {room.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      ${parseFloat(room.price_per_night).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{room.total_rooms} rooms</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(room)}
                        className="btn btn-outline btn-sm"
                        id={`btn-edit-room-${room.id}`}
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id, room.title)}
                        className="btn btn-danger-outline btn-sm"
                        id={`btn-delete-room-${room.id}`}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingRoom ? 'Edit Room Details' : 'Add New Hotel Room'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {modalError && <div className="alert alert-error">{modalError}</div>}

                <div className="form-group">
                  <label className="form-label">Room Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Presidential Suite"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="form-input"
                    id="input-room-title"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe amenities, view, bed size, features..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="form-input"
                    id="input-room-description"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price per Night ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="1"
                      placeholder="e.g. 240.00"
                      value={formData.price_per_night}
                      onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                      className="form-input"
                      id="input-room-price"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Rooms (Capacity)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 5"
                      value={formData.total_rooms}
                      onChange={(e) => setFormData({ ...formData, total_rooms: e.target.value })}
                      className="form-input"
                      id="input-room-capacity"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="form-input"
                    id="input-room-image"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-outline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-accent"
                  id="btn-save-room"
                >
                  {submitting ? 'Saving...' : editingRoom ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRooms;
