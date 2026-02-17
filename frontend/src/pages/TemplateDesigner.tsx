import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import Designer from './Designer';

export default function TemplateDesigner() {
    const { templateId } = useParams<{ templateId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // For now, redirect to Designer with a special template product ID
    // In the future, we can enhance Designer to handle template mode
    useEffect(() => {
        // Use a special product ID for templates
        const templateProductId = templateId || 'new-template';
        navigate(`/designer/${templateProductId}${location.search}`, { 
            replace: true,
            state: { isTemplate: true, templateId }
        });
    }, [templateId, navigate, location.search]);

    return <div>Loading template designer...</div>;
}
