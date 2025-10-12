
'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, PlusCircle, Phone, MessageSquare, AtSign, Link, MapPin } from 'lucide-react';
import type { ContactInfo } from '../actions';

const contactTypeOptions = [
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'email', label: 'Email', icon: AtSign },
    { value: 'url', label: 'Website/URL', icon: Link },
    { value: 'location', label: 'Location', icon: MapPin },
];

interface MultiContactEditorProps {
    contacts: ContactInfo[];
    onContactsChange: (contacts: ContactInfo[]) => void;
}

export function MultiContactEditor({ contacts, onContactsChange }: MultiContactEditorProps) {
    
    const handleAddContact = () => {
        const newContact: ContactInfo = {
            id: crypto.randomUUID(),
            type: 'phone',
            label: '',
            value: '',
        };
        onContactsChange([...contacts, newContact]);
    };

    const handleRemoveContact = (id: string) => {
        onContactsChange(contacts.filter(contact => contact.id !== id));
    };

    const handleContactChange = (id: string, field: keyof ContactInfo, value: string) => {
        onContactsChange(
            contacts.map(contact => 
                contact.id === id ? { ...contact, [field]: value } : contact
            )
        );
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4 space-y-4">
                    {contacts.length > 0 ? (
                        contacts.map((contact) => {
                            const Icon = contactTypeOptions.find(opt => opt.value === contact.type)?.icon || Link;
                            return (
                                <div key={contact.id} className="p-4 border rounded-lg space-y-4">
                                    <div className="flex justify-between items-center">
                                         <div className="flex items-center gap-2">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <Select 
                                                value={contact.type} 
                                                onValueChange={(v) => handleContactChange(contact.id, 'type', v as ContactInfo['type'])}
                                            >
                                                <SelectTrigger className="w-[150px]">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {contactTypeOptions.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveContact(contact.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor={`label-${contact.id}`}>Label</Label>
                                            <Input 
                                                id={`label-${contact.id}`} 
                                                value={contact.label} 
                                                onChange={(e) => handleContactChange(contact.id, 'label', e.target.value)}
                                                placeholder="e.g., Main Office, Sales"
                                            />
                                        </div>
                                        {contact.type !== 'location' && (
                                            <div className="space-y-1">
                                                <Label htmlFor={`value-${contact.id}`}>Value</Label>
                                                <Input 
                                                    id={`value-${contact.id}`} 
                                                    value={contact.value} 
                                                    onChange={(e) => handleContactChange(contact.id, 'value', e.target.value)}
                                                    placeholder={
                                                        contact.type === 'phone' ? '555-123-4567' :
                                                        contact.type === 'whatsapp' ? '+15551234567' :
                                                        contact.type === 'email' ? 'contact@example.com' :
                                                        'https://example.com'
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {contact.type === 'location' && (
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1 sm:col-span-2">
                                                <Label htmlFor={`address-${contact.id}`}>Address</Label>
                                                <Input 
                                                    id={`address-${contact.id}`} 
                                                    value={contact.address || ''} 
                                                    onChange={(e) => handleContactChange(contact.id, 'address', e.target.value)}
                                                    placeholder="123 Main St, Anytown, USA"
                                                />
                                            </div>
                                             <div className="space-y-1 sm:col-span-2">
                                                <Label htmlFor={`gmaps-${contact.id}`}>Google Maps URL (Optional)</Label>
                                                <Input 
                                                    id={`gmaps-${contact.id}`} 
                                                    value={contact.google_maps_url || ''} 
                                                    onChange={(e) => handleContactChange(contact.id, 'google_maps_url', e.target.value)}
                                                    placeholder="https://maps.app.goo.gl/..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No contact information added yet.</p>
                    )}
                    <div className="flex justify-center">
                        <Button type="button" variant="outline" onClick={handleAddContact}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Contact Point
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
