'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  MoreHorizontal,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  Eye,
  Users
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  updateDoc,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'parishioner' | 'admin' | 'priest';
  status: 'active' | 'inactive';
  joinDate: string;
  lastLogin?: string;
  address?: string;
  dateOfBirth?: string;
  parishionerId?: string;
  createdAt: Timestamp | Date | string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load users from Firestore
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading users from Firestore...');

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(usersQuery);
      console.log('📊 Users query snapshot size:', querySnapshot.size);

      const usersData: UserData[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('👤 User data:', doc.id, data);
        
        return {
          id: doc.id,
          fullName: data.fullName || 'Unknown',
          email: data.email || 'No email',
          phone: data.phone || 'No phone',
          role: data.role || 'parishioner',
          status: data.status || 'active',
          joinDate: data.joinDate || new Date().toISOString(),
          lastLogin: data.lastLogin,
          address: data.address,
          dateOfBirth: data.dateOfBirth,
          parishionerId: data.parishionerId,
          createdAt: data.createdAt || new Date(),
        };
      });

      console.log('✅ Loaded users:', usersData.length);
      setUsers(usersData);
      setFilteredUsers(usersData);

    } catch (error) {
      console.error('❌ Error loading users from Firestore:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
      
      // Fallback to mock data for demonstration
      setUsers(getMockUsers());
      setFilteredUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const getMockUsers = (): UserData[] => [
    {
      id: '1',
      fullName: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+639171234567',
      role: 'parishioner',
      status: 'active',
      joinDate: '2024-01-15',
      parishionerId: 'P-2024-00123',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      fullName: 'Juan Dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '+639181234568',
      role: 'parishioner',
      status: 'active',
      joinDate: '2024-02-20',
      parishionerId: 'P-2024-00124',
      createdAt: new Date('2024-02-20'),
    },
    {
      id: '3',
      fullName: 'Fr. Michael Santos',
      email: 'fr.michael@staugustine.ph',
      phone: '+639271234569',
      role: 'priest',
      status: 'active',
      joinDate: '2023-05-10',
      createdAt: new Date('2023-05-10'),
    },
    {
      id: '4',
      fullName: 'Admin User',
      email: 'admin@staugustine.ph',
      phone: '+639281234570',
      role: 'admin',
      status: 'active',
      joinDate: '2023-12-01',
      createdAt: new Date('2023-12-01'),
    },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on search and filters
  useEffect(() => {
    let result = users;

    // Search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.fullName.toLowerCase().includes(lowerSearchTerm) ||
        user.email.toLowerCase().includes(lowerSearchTerm) ||
        user.phone.includes(lowerSearchTerm) ||
        user.parishionerId?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(result);
  }, [searchTerm, roleFilter, statusFilter, users]);

  const handleViewUser = (user: UserData) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
  };

  const handleEditUser = (user: UserData) => {
    // Implement edit functionality
    toast({
      title: 'Edit User',
      description: `Edit functionality for ${user.fullName} would open here.`,
    });
  };

  const handleDeleteUser = (user: UserData) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', selectedUser.id));
      
      // Update local state
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      toast({
        title: 'User Deleted',
        description: `${selectedUser.fullName} has been deleted successfully.`,
      });
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleStatusChange = async (user: UserData, newStatus: 'active' | 'inactive') => {
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      // Update local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, status: newStatus } : u
      ));

      toast({
        title: 'Status Updated',
        description: `${user.fullName} is now ${newStatus}.`,
      });
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      parishioner: 'default',
      admin: 'destructive',
      priest: 'secondary',
    } as const;

    const colors = {
      parishioner: 'bg-blue-100 text-blue-800',
      admin: 'bg-red-100 text-red-800',
      priest: 'bg-purple-100 text-purple-800',
    };

    return (
      <Badge variant={variants[role as keyof typeof variants]} className={colors[role as keyof typeof colors]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date | Timestamp) => {
    if (dateString instanceof Timestamp) {
      return dateString.toDate().toLocaleDateString('en-US');
    }
    return new Date(dateString as string).toLocaleDateString('en-US');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="w-8 h-8" />
            Manage Users
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage all parish users and their accounts.
          </p>
        </div>
        <Button onClick={loadUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Parishioners</CardTitle>
            <User className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'parishioner').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Priests</CardTitle>
            <Shield className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'priest').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Search, filter, and manage all users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Roles</option>
                <option value="parishioner">Parishioner</option>
                <option value="priest">Priest</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      </div>
                      <p className="text-muted-foreground mt-2">Loading users...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No users found</p>
                      {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Try adjusting your search or filters
                        </p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(user.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            {user.parishionerId && (
                              <div className="text-sm text-muted-foreground">
                                {user.parishionerId}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(user.status)}
                          {user.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(user, 'inactive')}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(user, 'active')}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatDate(user.joinDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete information about the selected user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedUser.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.fullName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(selectedUser.role)}
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedUser.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedUser.phone}
                    </p>
                  </div>
                  {selectedUser.parishionerId && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Parishioner ID</label>
                      <p>{selectedUser.parishionerId}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Join Date</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedUser.joinDate)}
                    </p>
                  </div>
                  {selectedUser.dateOfBirth && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                      <p>{formatDate(selectedUser.dateOfBirth)}</p>
                    </div>
                  )}
                  {selectedUser.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Address</label>
                      <p>{selectedUser.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
            >
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}