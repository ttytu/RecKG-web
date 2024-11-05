import React, { useState, useEffect } from "react";
import { useUploadedData } from "../contexts/UploadedData";

const dataMap = {
	"user_data": ["user", "age", "gender", "occupation", "residence"],
	"item_data": ["item", "item_name", "performer", "type", "release_date"],
	"interaction_data": ["user", "item", "rating", "interaction"]
}

const Upload: React.FC = () => {
	const [loading, setLoading] = useState<boolean>(false);
	const [datasetName, setDatasetName] = useState<string>("");

	const [userFile, setUserFile] = useState<File | null>(null);
	const [itemFile, setItemFile] = useState<File | null>(null);
	const [interactionFile, setInteractionFile] = useState<File | null>(null);

	const [data, setData] = useState<any>(localStorage.getItem("uploadedData") ? JSON.parse(localStorage.getItem("uploadedData")!) : null);
	const [userData, setUserData] = useState<any>(
		{
			"user": false,
			"age": false,
			"gender": false,
			"occupation": false,
			"residence": false,
		}
	);
	const [itemData, setItemData] = useState<any>(
		{
			"item": false,
			"item_name": false,
			"performer": false,
			"type": false,
			"release_date": false,
		}
	);
	const [interactionData, setInteractionData] = useState<any>(
		{
			"user": false,
			"item": false,
			"rating": false,
			"interaction": false,
		}
	);

	const updateData = (type: string, value: string, attr: string) => {
		switch (type) {
			case "user":
				setUserData({
					...userData,
					[attr]: value,
				});
				break;
			case "item":
				setItemData({
					...itemData,
					[attr]: value,
				});
				break;
			case "interaction":
				setInteractionData({
					...interactionData,
					[attr]: value,
				});
				break;
		}
		console.log(type, value, attr);
	};

	const handleFileChange = (type: "user" | "item" | "interaction") => (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) {
			return;
		}

		const file = e.target.files[0];
		switch (type) {
			case "user":
				setUserFile(file);
				break;
			case "item":
				setItemFile(file);
				break;
			case "interaction":
				setInteractionFile(file);
				break;
		}
	}

	const handleDatasetNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDatasetName(e.target.value);
	}

	const handleUpload = async () => {
		if (!userFile || !itemFile || !interactionFile) {
			alert("Please upload all 3 files.");
			return;
		}

		if (!datasetName) {
			alert("Please input a dataset name.");
			return;
		}

		setLoading(true);

		const formData = new FormData();
		// formData.append("dataset_name", datasetName);
		formData.append("user_file", userFile);
		formData.append("item_file", itemFile);
		formData.append("interaction_file", interactionFile);

		try {
			const response = await fetch(`http://165.246.21.166/api/uploadfiles/?dataset_name=${datasetName}`, {
				method: "POST",
				headers: {
					"accept": "application/json",
				},
				body: formData,
			});

			if (response.ok) {
				alert("Files uploaded successfully!");

				const data = await response.json();
				setData(data);
				localStorage.setItem("uploadedData", JSON.stringify(data));
			} else {
				alert("Failed to upload files.");
			}
		} catch (error) {
			console.error("Error uploading files:", error);
			alert("An error occurred while uploading files.");
		} finally {
			setLoading(false);
		}
	};

	const processData = async () => {
		if (!data) {
			alert("No data to process.");
			return;
		}

		setLoading(true);

		const pData = [{
			"id": data[0].id,
			"user_data": userData,
			"item_data": itemData,
			"interaction_data": interactionData,
		}]
		console.log(pData);

		try {
			const response = await fetch(`http://165.246.21.166/api/process_data/`, {
				method: "POST",
				headers: {
					"accept": "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(pData),
			});

			if (response.ok) {
				// alert("Data processed successfully!");
			} else {
				alert("Failed to process data.");
			}
		} catch (error) {
			console.error("Error processing data:", error);
			alert("An error occurred while processing data.");
		} finally {
			setLoading(false);
			window.location.href = "/graph";
		}
	};

	return (
		<div className="w-full h-full flex gap-4 flex-col lg:flex-row">
			<div className="lg:w-[300px] flex flex-col gap-4 justify-start">
				<h1 className="text-2xl font-bold">Upload Your Dataset</h1>
				<p className="text-zinc-500">
					Upload 3 files to create your own RecKG. User-Item interaction data, user attributes, and item attributes are required.
				</p>

				<div className="flex flex-col gap-4 p-4 bg-zinc-800">
					<h3 className="text-lg font-bold">
						{data ? "Files Uploaded" : "Upload Files"}
					</h3>
					{!data && (
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<div className="flex flex-col">
									<label className="text-gray-300">Dataset Name</label>
									<input
										type="text"
										required
										value={datasetName}
										disabled={loading}
										onChange={handleDatasetNameChange}
										placeholder="Input Dataset Name"
										className="bg-zinc-700 px-2 py-1"
									/>
								</div>
								<div className="flex flex-col">
									<label className="text-gray-300">User Attributes File</label>
									<input
										type="file"
										accept=".csv"
										disabled={loading}
										onChange={handleFileChange("user")}
										className="
											bg-zinc-700
											file:px-2 file:py-1
											file:mr-4 file:p-2 file:border-0 hover:file:opacity-80"
									/>
								</div>
								<div className="flex flex-col">
									<label className="text-gray-300">Item Attributes File</label>
									<input
										type="file"
										accept=".csv"
										disabled={loading}
										onChange={handleFileChange("item")}
										className="
											bg-zinc-700
											file:px-2 file:py-1
											file:mr-4 file:p-2 file:border-0 hover:file:opacity-80"
									/>
								</div>
								<div className="flex flex-col">
									<label className="text-gray-300">User-Item Interaction File</label>
									<input
										type="file"
										accept=".csv"
										disabled={loading}
										onChange={handleFileChange("interaction")}
										className="
											bg-zinc-700
											file:px-2 file:py-1
											file:mr-4 file:p-2 file:border-0 hover:file:opacity-80"
									/>
								</div>
							</div>
							<button
								className="btn-primary p-2"
								disabled={loading}
								onClick={handleUpload}
							>
								{loading ? "Uploading..." : "Upload"}
							</button>
						</div>
					)}
					{data && (
						<button
							className="btn-primary p-2"
							onClick={() => {
								setData(null);
								localStorage.removeItem("uploadedData");
							}}
						>
							Upload New Files
						</button>
					)}
				</div>
			</div>

			<div className="grow h-[90vh] p-4 flex flex-col gap-4 bg-gradient-to-t from-zinc-900 to-zinc-800">
				<h2 className="text-xl font-bold">Map Your Dataset</h2>
				{data && (
					<div className="flex flex-col md:flex-row md:justify-between gap-4">
						<div className="md:w-1/4 flex flex-col gap-2">
							<h3 className="text-lg font-semibold">User Data</h3>
							<div className="
							flex flex-col
							*:border-b-[1px] *:border-b-zinc-600 *:py-1"
							>
								{dataMap.user_data.map((attr: string) => (
									<div key={attr} className="flex justify-between">
										<p className="">{attr}</p>
										<select onChange={(e) => updateData("user", "user", e.target.value)}>
											<option key="user">{false}</option>
											{data[1].user_file.map((dataAttr: any) => (
												<option key={dataAttr}>{dataAttr}</option>
											))}
										</select>
									</div>
								))}
							</div>
						</div>
						<div className="md:w-1/4 flex flex-col gap-2">
							<h3 className="text-lg font-semibold">Item Data</h3>
							<div className="
							flex flex-col
							*:border-b-[1px] *:border-b-zinc-600 *:py-1"
							>
								{dataMap.item_data.map((attr: string) => (
									<div key={attr} className="flex py-1 border-b-[1px] border-zinc-600 justify-between">
										<p key={attr}>{attr}</p>
										<select onChange={(e) => updateData("item", attr, e.target.value)}>
											<option key="item">{false}</option>
											{data[2].item_file.map((dataAttr: any) => (
												<option key={dataAttr}>{dataAttr}</option>
											))}
										</select>
									</div>
								))}
							</div>
						</div>
						<div className="md:w-1/4 flex flex-col gap-2">
							<h3 className="text-lg font-semibold">Interaction Data</h3>
							<div
								className="
								flex flex-col
								*:border-b-[1px] *:border-b-zinc-600 *:py-1"
							>
								{dataMap.interaction_data.map((attr: string) => (
									<div key={attr} className="flex py-1 border-b-[1px] border-zinc-600 justify-between">
										<p key={attr}>{attr}</p>
										<select onChange={(e) => updateData("interaction", attr, e.target.value)}>
											<option key="interaction">{false}</option>
											{data[3].interaction_file.map((dataAttr: any) => (
												<option key={dataAttr}>{dataAttr}</option>
											))}
										</select>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
				{!data && (
					<p className="text-gray-300">Upload files to map your dataset.</p>
				)}

				<button
					className="btn-primary p-2 mt-auto"
					disabled={loading || !data}
					onClick={processData}
				>
					{loading ? "Processing..." : "Process Data"}
				</button>
			</div>
		</div>
	);
};

export default Upload;
