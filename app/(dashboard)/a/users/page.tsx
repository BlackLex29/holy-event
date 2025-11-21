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
  Eye,
  Users,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  doc,
  updateDoc,
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
  birthday?: string;
  age?: number;
  gender?: string;
  parishionerId?: string;
  createdAt: Timestamp | Date | string;
  emailVerified?: boolean;
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
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { toast } = useToast();

  // Load users from Firestore
  const loadUsers = async () => {
    try {
      setLoading(true);
      setDebugInfo('Starting to load users from Firestore...');
      console.log('📥 Loading users from Firestore...');

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(usersQuery);
      console.log('📊 Users query snapshot size:', querySnapshot.size);
      setDebugInfo(`Found ${querySnapshot.size} users in Firestore`);

      const usersData: UserData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('👤 User data:', doc.id, data);
        
        // Handle different date formats
        let joinDate = '';
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            joinDate = data.createdAt.toDate().toISOString().split('T')[0];
          } else if (data.createdAt instanceof Date) {
            joinDate = data.createdAt.toISOString().split('T')[0];
          } else if (typeof data.createdAt === 'string') {
            joinDate = data.createdAt.split('T')[0];
          }
        } else {
          joinDate = new Date().toISOString().split('T')[0];
        }

        const user: UserData = {
          id: doc.id,
          fullName: data.fullName || data.name || data.displayName || 'Unknown User',
          email: data.email || 'No email provided',
          phone: data.phone || data.phoneNumber || 'No phone provided',
          role: data.role || 'parishioner',
          status: data.status || 'active',
          joinDate: joinDate,
          birthday: data.birthday || data.birthDate,
          age: data.age,
          gender: data.gender,
          address: data.address || data.location,
          parishionerId: data.parishionerId || data.userId || `P-${new Date().getFullYear()}-${doc.id.slice(-5).toUpperCase()}`,
          createdAt: data.createdAt || new Date(),
          emailVerified: data.emailVerified || false,
          lastLogin: data.lastLogin || data.lastSignInTime
        };
        
        usersData.push(user);
      });

      console.log('✅ Loaded users:', usersData);
      setUsers(usersData);
      setFilteredUsers(usersData);

      if (usersData.length === 0) {
        setDebugInfo('No users found in Firestore collection');
        toast({
          title: 'No Users Found',
          description: 'No users have registered in the system yet. Users will appear here after they register.',
          variant: 'default',
        });
      } else {
        setDebugInfo(`Successfully loaded ${usersData.length} users`);
      }

    } catch (error: any) {
      console.error('❌ Error loading users from Firestore:', error);
      setDebugInfo(`Error: ${error.message}`);
      toast({
        title: 'Error Loading Users',
        description: `Failed to load users: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format Firebase timestamp
  const formatFirebaseDate = (timestamp: any): string => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString().split('T')[0];
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString().split('T')[0];
    }
    if (typeof timestamp === 'string') {
      return timestamp.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

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

  const handleRoleChange = async (user: UserData, newRole: 'parishioner' | 'admin' | 'priest') => {
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.id), {
        role: newRole,
        updatedAt: new Date(),
      });

      // Update local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Role Updated',
        description: `${user.fullName} is now ${newRole}.`,
      });
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      parishioner: 'bg-blue-100 text-blue-800 border-blue-200',
      admin: 'bg-red-100 text-red-800 border-red-200',
      priest: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
      <Badge variant="outline" className={colors[role as keyof typeof colors]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <Badge variant="outline" className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date | Timestamp) => {
    if (dateString instanceof Timestamp) {
      return dateString.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return new Date(dateString as string).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        <div className="flex flex-col gap-2">
          <Button onClick={loadUsers} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* Debug Info - Only show in development */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              {debugInfo}
            </div>
          )}
        </div>
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
            <p className="text-xs text-muted-foreground">Registered in system</p>
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
            <p className="text-xs text-muted-foreground">Community members</p>
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
            <p className="text-xs text-muted-foreground">Clergy members</p>
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
            <p className="text-xs text-muted-foreground">System administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Search, filter, and manage all users in the system. {users.length === 0 && 'No users found - users will appear here after they register.'}
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
                      <p className="text-muted-foreground mt-2">Loading users from database...</p>
                      <p className="text-sm text-muted-foreground">Checking Firestore collection...</p>
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
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            No users have registered in the system yet
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Users will appear here after they complete registration
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
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
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getRoleBadge(user.role)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 text-xs">
                                Change Role
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleRoleChange(user, 'parishioner')}>
                                Parishioner
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user, 'priest')}>
                                Priest
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user, 'admin')}>
                                Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
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
                  {selectedUser.parishionerId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ID: {selectedUser.parishionerId}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Contact Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {selectedUser.email}
                        {selectedUser.emailVerified && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">
                            Verified
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4" />
                        {selectedUser.phone}
                      </p>
                    </div>
                    {selectedUser.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="mt-1">{selectedUser.address}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Profile Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Join Date</label>
                      <p className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(selectedUser.joinDate)}
                      </p>
                    </div>
                    {selectedUser.birthday && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Birthday</label>
                        <p>{formatDate(selectedUser.birthday)}</p>
                      </div>
                    )}
                    {selectedUser.age && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Age</label>
                        <p>{selectedUser.age} years old</p>
                      </div>
                    )}
                    {selectedUser.gender && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Gender</label>
                        <p className="capitalize">{selectedUser.gender}</p>
                      </div>
                    )}
                  </div>
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