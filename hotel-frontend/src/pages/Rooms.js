import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function Rooms() {
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRoom,  setEditRoom]  = useState(null);
  const [form, setForm] = useState({
    room_number: '', room_type: 'Single', ac_type: 'AC',
    price: '', status: 'Available'
  });

  const fetchRooms = () => {
    setLoading(true);
    API.get('/api/rooms')
      .then(r => setRooms(r.data))
      .catch(() => toast.error('Failed to load rooms'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRooms(); }, []);

  const openAdd = () => {
    setEditRoom(null);
    setForm({ room_number:'', room_type:'Single', ac_type:'AC', price:'', status:'Available' });
    setShowModal(true);
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setForm({
      room_number: room.room_number,
      room_type:   room.room_type,
      ac_type:     room.ac_type,
      price:       room.price,
      status:      room.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editRoom) {
        await API.put(`/api/rooms/${editRoom.id}`, form);
        toast.success(`Room ${form.room_number} updated!`);
      } else {
        await API.post('/api/rooms', form);
        toast.success(`Room ${form.room_number} created!`);
      }
      setShowModal(false);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    }
  };

  const handleDelete = async (room) => {
    if (!window.confirm(`Delete Room ${room.room_number}?`)) return;
    try {
      await API.delete(`/api/rooms/${room.id}`);
      toast.success(`Room ${room.room_number} deleted!`);
      fetchRooms();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot delete room');
    }
  };

  const statusColor = {
    Available:   { bg: '#dcfce7', color: '#16a34a' },
    Occupied:    { bg: '#fee2e2', color: '#dc2626' },
    Maintenance: { bg: '#fef9c3', color: '#ca8a04' },
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>🛏️ Rooms</h2>
        <button className="btn btn-primary" onClick={openAdd}>
          ➕ Add Room
        </button>
      </div>

      {/* Stats Row */}
      <div className="stat-grid">
        {[
          { label:'Total Rooms',    value: rooms.length,                                    color:'#3b82f6' },
          { label:'Available',      value: rooms.filter(r=>r.status==='Available').length,  color:'#22c55e' },
          { label:'Occupied',       value: rooms.filter(r=>r.status==='Occupied').length,   color:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ '--stat-color': s.color }}>
            <div style={{ fontSize:'24px', fontWeight:'700', color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'13px', color:'#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
            ⏳ Loading rooms...
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Room No.</th>
                  <th>Type</th>
                  <th>AC</th>
                  <th>Price/Night</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign:'center', padding:'40px', color:'#64748b' }}>
                      No rooms found
                    </td>
                  </tr>
                ) : rooms.map(room => (
                  <tr key={room.id}>
                    <td style={{ fontWeight:'700', fontSize:'16px' }}>
                      🛏️ {room.room_number}
                    </td>
                    <td>{room.room_type}</td>
                    <td>{room.ac_type}</td>
                    <td style={{ color:'#1F3A5F', fontWeight:'600' }}>
                      ৳{room.price?.toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'600',
                        background: statusColor[room.status]?.bg || '#f1f5f9',
                        color:      statusColor[room.status]?.color || '#64748b'
                      }}>
                        {room.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ marginRight:'8px', padding:'6px 14px', fontSize:'12px' }}
                        onClick={() => openEdit(room)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding:'6px 14px', fontSize:'12px' }}
                        onClick={() => handleDelete(room)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editRoom ? '✏️ Edit Room' : '➕ Add New Room'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Room Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={form.room_number}
                    onChange={e => setForm({...form, room_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price Per Night (৳) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={form.price}
                    onChange={e => setForm({...form, price: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room Type *</label>
                  <select
                    value={form.room_type}
                    onChange={e => setForm({...form, room_type: e.target.value})}
                  >
                    <option>Single</option>
                    <option>Double</option>
                    <option>Suite</option>
                    <option>Deluxe</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>AC Type *</label>
                  <select
                    value={form.ac_type}
                    onChange={e => setForm({...form, ac_type: e.target.value})}
                  >
                    <option>AC</option>
                    <option>Non-AC</option>
                  </select>
                </div>
              </div>

              {editRoom && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value})}
                  >
                    <option>Available</option>
                    <option>Occupied</option>
                    <option>Maintenance</option>
                  </select>
                </div>
              )}

              <div style={{ display:'flex', gap:'12px', marginTop:'8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }}>
                  {editRoom ? '💾 Update Room' : '➕ Add Room'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex:1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}