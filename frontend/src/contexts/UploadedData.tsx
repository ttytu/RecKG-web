import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';


interface UploadedData {
	id: string;
	timestamp: string;
	dataset_name: string;
	has_files: boolean;
}

interface UploadedDataContextType {
	uploadedData: UploadedData[];
	fetchUploadedData: () => Promise<void>;
}

const UploadedDataContext = createContext<UploadedDataContextType | undefined>(undefined);

export const UploadedDataProvider = ({ children }: { children: ReactNode }) => {
	const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);

	const fetchUploadedData = async () => {
		try {
			const response = await fetch(`${process.env.REACT_APP_URI}/get-id-list`);
			const data = await response.json();
			console.log('Fetched uploaded data', data);
			setUploadedData(data);
		} catch (error) {
			console.error('Failed to fetch uploaded data', error);
		}
	};

	return (
		<UploadedDataContext.Provider value={{ uploadedData, fetchUploadedData }}>
			{children}
		</UploadedDataContext.Provider>
	);
};

export const useUploadedData = () => {
	const context = useContext(UploadedDataContext);
	if (context === undefined) {
		throw new Error('useUploadedData must be used within an UploadedDataProvider');
	}
	return context;
};